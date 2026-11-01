// ══════════ SYNC — merge logic that lets several editors save without overwriting each other ══════════
// Pure functions: no Firestore in here, so they can be tested on their own.
//
// The idea: every browser remembers the last state it synced with the server (the "base").
// To save, it works out what THIS editor changed (local vs base) and applies only those changes
// on top of the latest server version — instead of replacing whole documents with its own copy.
// Result: two admins adding parts / models at the same time both end up saved.

const SYNC_MODEL_FIELDS = ['parts','images','columns','synonyms','notes'];

// deep equality with an identity shortcut (unchanged React state keeps its object identity, so this is cheap)
function syncEq(a,b){
  if (a===b) return true;
  if (a==null || b==null) return a==b;
  if (typeof a!=='object' || typeof b!=='object') return false;
  const aa=Array.isArray(a), ba=Array.isArray(b);
  if (aa!==ba) return false;
  if (aa){
    if (a.length!==b.length) return false;
    for (let i=0;i<a.length;i++) if(!syncEq(a[i],b[i])) return false;
    return true;
  }
  const ka=Object.keys(a).filter(k=>a[k]!==undefined), kb=Object.keys(b).filter(k=>b[k]!==undefined);
  if (ka.length!==kb.length) return false;
  for (const k of ka) if(!syncEq(a[k],b[k])) return false;
  return true;
}

// Firestore rejects `undefined` values — strip them (copy-on-write, strings/base64 are passed by reference)
function syncClean(v){
  if (v===undefined) return undefined;
  if (v===null || typeof v!=='object') return v;
  if (Array.isArray(v)) return v.map(x=>{ const c=syncClean(x); return c===undefined?null:c; });
  const o={};
  for (const k of Object.keys(v)){ const c=syncClean(v[k]); if(c!==undefined) o[k]=c; }
  return o;
}

// ── order ──
// Server order wins; locally-deleted ids are dropped; locally-added ids are inserted after their local predecessor;
// if the user re-ordered items locally, their order is applied to the items they know about.
function syncMergeOrder(baseIds, localIds, serverIds){
  const inBase=new Set(baseIds), inLocal=new Set(localIds), inServer=new Set(serverIds);
  const res = serverIds.filter(id => !(inBase.has(id) && !inLocal.has(id)));
  const adds = localIds.filter(id => !inBase.has(id) && !inServer.has(id));
  for (const id of adds){
    const li = localIds.indexOf(id);
    let pos = -1;
    for (let j=li-1;j>=0;j--){ const k=res.indexOf(localIds[j]); if(k>=0){ pos=k+1; break; } }
    if (pos<0) pos = (li===0) ? 0 : res.length;
    res.splice(pos,0,id);
  }
  const baseCommon  = baseIds.filter(id=>inLocal.has(id));
  const localCommon = localIds.filter(id=>inBase.has(id));
  const reordered = baseCommon.length===localCommon.length && baseCommon.some((id,i)=>id!==localCommon[i]);
  if (reordered){
    const common = new Set(localCommon);
    const slots=[]; res.forEach((id,i)=>{ if(common.has(id)) slots.push(i); });
    const present = new Set(res);
    const seq = localCommon.filter(id=>present.has(id));
    slots.forEach((slot,i)=>{ res[slot]=seq[i]; });
  }
  return res;
}

// ── lists of {id,...} objects ──
function syncMergeList(baseL, localL, serverL, mergeFn){
  baseL=baseL||[]; localL=localL||[]; serverL=serverL||[];
  const B=new Map(baseL.map(x=>[x.id,x])), L=new Map(localL.map(x=>[x.id,x])), S=new Map(serverL.map(x=>[x.id,x]));
  // deleted by someone else but edited here → keep the edited local copy
  const rescued = new Set(localL.filter(x=>B.has(x.id) && !S.has(x.id) && !syncEq(x,B.get(x.id))).map(x=>x.id));
  const ids = syncMergeOrder(baseL.map(x=>x.id).filter(id=>!rescued.has(id)), localL.map(x=>x.id), serverL.map(x=>x.id));
  const out=[];
  for (const id of ids){
    const l=L.get(id), s=S.get(id), b=B.get(id);
    if (l && s) out.push(mergeFn(b,l,s));
    else if (s) out.push(s);
    else if (l) out.push(l);
  }
  return out;
}

// ── objects: only fields THIS editor changed win ──
function syncMergeFields(b,l,s,skip){
  b=b||{}; l=l||{}; s=s||{};
  const out={...s};
  for (const k of Object.keys(l)){
    if (skip && skip.includes(k)) continue;
    if (!syncEq(l[k],b[k])) out[k]=l[k];
    else if (!(k in s)) { /* the other editor removed this field; unchanged here → keep it removed */ }
  }
  for (const k of Object.keys(b)){
    if (skip && skip.includes(k)) continue;
    if (!(k in l)) delete out[k];
  }
  return out;
}

// arrays of plain values (image data-urls, synonyms): removals + additions, order from the server
function syncMergeValues(b,l,s){
  b=b||[]; l=l||[]; s=s||[];
  const bs=new Set(b), ls=new Set(l), ss=new Set(s);
  const removed=new Set(b.filter(x=>!ls.has(x)));
  const added=l.filter(x=>!bs.has(x) && !ss.has(x));
  return s.filter(x=>!removed.has(x)).concat(added);
}

// ── a single part row ──
function syncMergePart(b,l,s){
  if (!b) return l;
  if (syncEq(l,b)) return s;                 // this editor didn't touch it
  const out=syncMergeFields(b,l,s,['values']);
  out.values=syncMergeFields(b.values||{}, l.values||{}, s.values||{});
  return out;
}

// ── a whole model document (parts / images / columns / synonyms / notes) ──
function syncMergeModelDoc(base, local, server){
  base=base||{parts:[],images:[],columns:[],synonyms:[],notes:''};
  const out={...server};
  out.parts    = syncMergeList(base.parts,   local.parts,   server.parts,   syncMergePart);
  out.columns  = syncMergeList(base.columns, local.columns, server.columns, (b,l,s)=>syncMergeFields(b,l,s));
  out.images   = syncMergeValues(base.images,   local.images,   server.images);
  out.synonyms = syncMergeValues(base.synonyms, local.synonyms, server.synonyms);
  out.notes    = !syncEq(local.notes,base.notes) ? local.notes : (server.notes||'');
  return out;
}

// ── the slim "meta" document (settings + brand/category/model tree, models are stubs) ──
const syncStub = m => ({id:m.id, name:m.name, hidden:!!m.hidden});
function syncMergeStub(b,l,s){
  const bb=b||{};
  const out={id:l.id, name:s.name, hidden:!!s.hidden};      // always slim, even if the server copy still has embedded data
  if (l.name!==bb.name) out.name=l.name;
  if (!!l.hidden!==!!bb.hidden) out.hidden=!!l.hidden;
  return out;
}
function syncMergeSubCat(b,l,s){
  const out=syncMergeFields(b,l,s,['models']);
  out.models=syncMergeList(b&&b.models,l.models,s.models,syncMergeStub);
  return out;
}
function syncMergeCategory(b,l,s){
  const out=syncMergeFields(b,l,s,['models','subCategories']);
  out.models=syncMergeList(b&&b.models,l.models,s.models,syncMergeStub);
  if ('subCategories' in l || 'subCategories' in s || (b&&'subCategories' in b))
    out.subCategories=syncMergeList(b&&b.subCategories,l.subCategories,s.subCategories,syncMergeSubCat);
  return out;
}
function syncMergeBrand(b,l,s){
  const out=syncMergeFields(b,l,s,['categories']);
  out.categories=syncMergeList(b&&b.categories,l.categories,s.categories,syncMergeCategory);
  return out;
}
function syncMergeMeta(base, local, server){
  base=base||{};
  const out=syncMergeFields(base,local,server,['brands']);
  out.brands=syncMergeList(base.brands,local.brands,server.brands,syncMergeBrand);
  return out;
}

// ── helpers that turn the app's `data` into documents ──
function syncAllModels(data){
  const out=[];
  (data.brands||[]).forEach(b=>(b.categories||[]).forEach(c=>{
    (c.models||[]).forEach(m=>out.push({b,c,m,sub:false}));
    (c.subCategories||[]).forEach(sc=>(sc.models||[]).forEach(m=>out.push({b,c,sc,m,sub:true})));
  }));
  return out;
}
function syncModelDoc(m){
  return {parts:m.parts||[], images:m.images||[], columns:m.columns||DCOLS(), synonyms:m.synonyms||[], notes:m.notes||''};
}
function syncDocEq(a,b){
  if (!a||!b) return a===b;
  for (const f of SYNC_MODEL_FIELDS) if (a[f]!==b[f] && !syncEq(a[f],b[f])) return false;
  return true;
}
function syncSlimMeta(data){
  return {
    users:data.users||DEFAULT_USERS,
    pass:data.pass, editorPass:data.editorPass, viewerPass:data.viewerPass,
    waDefaults:data.waDefaults||['nameHe','tadPn'],
    welcomeTitle:data.welcomeTitle, welcomeSub:data.welcomeSub,
    disclaimer:data.disclaimer, partsDisclaimer:data.partsDisclaimer||DEFAULT_DISCLAIMER,
    tips:data.tips||[], greetings:data.greetings||null, systemMsg:data.systemMsg||null,
    brands:(data.brands||[]).map(b=>({...b,categories:(b.categories||[]).map(c=>{
      const cc={...c,models:(c.models||[]).map(syncStub)};
      if (c.subCategories) cc.subCategories=c.subCategories.map(sc=>({...sc,models:(sc.models||[]).map(syncStub)}));
      return cc;
    })}))
  };
}
// normalise a meta document as stored on the server (legacy ones embed full sub-category models) so it can be compared
function syncNormMeta(meta){
  if (!meta) return meta;
  return {...meta, brands:(meta.brands||[]).map(b=>({...b,categories:(b.categories||[]).map(c=>{
    const cc={...c,models:(c.models||[]).map(syncStub)};
    if (c.subCategories) cc.subCategories=c.subCategories.map(sc=>({...sc,models:(sc.models||[]).map(syncStub)}));
    return cc;
  })}))};
}
const syncDefaults = p => ({discontinued:false,tags:'',pinned:false,comments:[],hidden:false,...p});
function syncHydrate(stub, doc){
  return {...stub,
    parts:(doc.parts||[]).map(syncDefaults),
    images:doc.images||[], columns:doc.columns||DCOLS(), synonyms:doc.synonyms||[], notes:doc.notes||''};
}
// rebuild the brand tree from a (merged) slim meta, reusing model objects we already have
function syncRebuildBrands(meta, haveModels, remoteDocs){
  const mk = stub => haveModels.get(stub.id) || syncHydrate(stub, (remoteDocs&&remoteDocs[stub.id])||{});
  const withName = (stub,m) => (m.name===stub.name && !!m.hidden===!!stub.hidden) ? m : {...m,name:stub.name,hidden:!!stub.hidden};
  return meta.brands.map(b=>({...b,categories:(b.categories||[]).map(c=>{
    const cc={...c,models:(c.models||[]).map(st=>withName(st,mk(st)))};
    if (c.subCategories) cc.subCategories=c.subCategories.map(sc=>({...sc,models:(sc.models||[]).map(st=>withName(st,mk(st)))}));
    return cc;
  })}));
}
// replace models inside a data tree (keeps untouched objects identical)
function syncMapModels(data, fn){
  let changed=false;
  const brands=data.brands.map(b=>({...b,categories:b.categories.map(c=>{
    const models=(c.models||[]).map(m=>{ const n=fn(m); if(n!==m) changed=true; return n; });
    const cc={...c,models};
    if (c.subCategories) cc.subCategories=c.subCategories.map(sc=>({...sc,models:(sc.models||[]).map(m=>{ const n=fn(m); if(n!==m) changed=true; return n; })}));
    return cc;
  })}));
  return changed ? {...data,brands} : data;
}
