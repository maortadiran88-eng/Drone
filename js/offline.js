// ══════════ עותק מקומי של הקטלוג — לצפייה בלי קליטה (קריאה בלבד) ══════════
// נשמר ב-IndexedDB של המכשיר אחרי כניסה מוצלחת. אם הטעינה מהשרת נכשלת, מוצג העותק האחרון.
// שמירה לשרת חסומה כל עוד הקטלוג לא נטען מהשרת (SYNC_ST.loaded=false), כך שהעותק לעולם לא דורס את השרת.
const OFFLINE_ST = { fromCache:false, savedAt:null };
const _offIdb = () => new Promise((res, rej) => {
  try {
    const r = indexedDB.open('tadiran-catalog', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  } catch(e) { rej(e); }
});
// למשתמש צופה: בלי מותגים/דגמים/חלקים מוסתרים (לא נשמרים על המכשיר)
function offlineFilter(data, editor){
  if (editor) return data;
  const d = JSON.parse(JSON.stringify(data));
  d.brands = (d.brands||[]).filter(b=>!b.hidden).map(b=>({...b,categories:(b.categories||[]).map(c=>{
    const fm = ms => (ms||[]).filter(m=>!m.hidden).map(m=>({...m,parts:(m.parts||[]).filter(p=>!p.hidden)}));
    return {...c, models:fm(c.models), subCategories:(c.subCategories||[]).map(sc=>({...sc,models:fm(sc.models)}))};
  })}));
  return d;
}
async function offlineSave(data, editor){
  try {
    const db0 = await _offIdb();
    const payload = JSON.stringify({savedAt:Date.now(), editor:!!editor, data:offlineFilter(data, editor)});
    await new Promise((res, rej) => { const tx = db0.transaction('kv','readwrite'); tx.objectStore('kv').put(payload,'catalog'); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
  } catch(e) { console.warn('[offline] cache skipped', e && e.message); }
}
async function offlineLoad(){
  try {
    const db0 = await _offIdb();
    const raw = await new Promise((res, rej) => { const rq = db0.transaction('kv').objectStore('kv').get('catalog'); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error); });
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && o.data && Array.isArray(o.data.brands)) ? o : null;
  } catch(e) { return null; }
}
