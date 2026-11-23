// ══════════ TOAST — הודעות לא חוסמות במקום alert() של הדפדפן ══════════
// כל קריאה קיימת ל-alert(...) באתר מוצגת עכשיו כהודעה צפה ויפה. אין שינוי בלוגיקה.
(function(){
  if (window.__toastReady) return; window.__toastReady = true;
  window._nativeAlert = window.alert.bind(window);

  const css = document.createElement('style');
  css.textContent = `
  #toast-host{position:fixed;inset-inline:0;bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:2000;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 14px}
  @media (max-width:760px){#toast-host{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
  .toast{pointer-events:auto;display:flex;align-items:center;gap:10px;max-width:min(520px,100%);padding:12px 16px;border-radius:16px;font:600 14px/1.45 var(--font,Heebo,Arial,sans-serif);direction:rtl;cursor:pointer;
    color:var(--text,#0b1b3a);background:var(--card,#fff);border:1px solid var(--border2,#cfd7e5);border-inline-start:4px solid var(--cyan,#0fb8cf);
    box-shadow:0 18px 40px -16px rgba(11,27,58,.45);white-space:pre-line;word-break:break-word;animation:toastIn .28s var(--ease,ease-out) both}
  .toast.ok{border-inline-start-color:var(--green,#157347)}
  .toast.err{border-inline-start-color:var(--red,#c0242c)}
  .toast.out{animation:toastOut .2s ease-in both}
  @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  @keyframes toastOut{to{opacity:0;transform:translateY(8px)}}
  @media (prefers-reduced-motion:reduce){.toast,.toast.out{animation:none}}`;
  document.head.appendChild(css);

  let host;
  const ensureHost = () => {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div'); host.id = 'toast-host';
    host.setAttribute('role','status'); host.setAttribute('aria-live','polite');
    document.body.appendChild(host); return host;
  };

  window.toast = function(msg, type){
    const text = String(msg == null ? '' : msg).trim(); if (!text) return;
    const kind = type || (/^✅/.test(text) ? 'ok' : /שגיאה|נכשל|לא נשמר/.test(text) ? 'err' : 'info');
    const h = ensureHost();
    while (h.children.length >= 4) h.removeChild(h.firstChild);
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = text;
    const close = () => { if (!el.parentNode) return; el.classList.add('out'); setTimeout(()=>el.parentNode&&el.parentNode.removeChild(el), 200); };
    el.addEventListener('click', close);
    h.appendChild(el);
    setTimeout(close, Math.min(9000, 2600 + text.length * 45));
  };
  window.alert = function(msg){ window.toast(msg); };
})();
