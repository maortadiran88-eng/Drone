// ══════════ מצב קל: מכשירים חלשים / חיסכון בנתונים / "הפחתת תנועה" ← פחות אפקטים כבדים ══════════
(function(){
  try {
    const nav = navigator, conn = nav.connection || {};
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
    const weak = (nav.deviceMemory && nav.deviceMemory <= 2) ||
                 (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4 && /Android/i.test(nav.userAgent)) ||
                 conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
    window.__LITE__ = !!(reduce || weak);
    if (window.__LITE__) document.documentElement.classList.add('lite');
  } catch(e) {}
})();

// ══════════ כפתור "חזרה למעלה" — מופיע בגלילה ארוכה (בדף או בתוך אזור גלילה ראשי) ══════════
(function(){
  if (window.__topReady) return; window.__topReady = true;
  const css = document.createElement('style');
  css.textContent = `
  #to-top{position:fixed;inset-inline-start:16px;bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:700;width:46px;height:46px;border-radius:50%;border:0;display:grid;place-items:center;cursor:pointer;
    color:#fff;background:var(--grad-brand,linear-gradient(120deg,#0a2a63,#1565c0 50%,#0fb8cf));box-shadow:0 14px 30px -12px rgba(21,101,192,.7),inset 0 1px 0 rgba(255,255,255,.25);
    opacity:0;transform:translateY(12px) scale(.9);pointer-events:none;transition:opacity .2s ease,transform .25s var(--ease,ease-out)}
  #to-top.on{opacity:1;transform:none;pointer-events:auto}
  #to-top:active{transform:scale(.93)}
  @media (max-width:760px){#to-top{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
  .dark #to-top{color:#04141a}
  @media (prefers-reduced-motion:reduce){#to-top{transition:none}}`;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.id = 'to-top'; btn.type = 'button'; btn.setAttribute('aria-label','חזרה לראש הדף'); btn.title = 'חזרה למעלה';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>';
  let target = null, hideT;
  const inFixed = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { if (getComputedStyle(n).position === 'fixed') return true; } return false; };
  const scroller = e => {
    const t = e.target === document ? document.scrollingElement : e.target;
    if (!t || t.nodeType !== 1) return null;
    if (t === document.scrollingElement) return t;
    if (t.clientWidth < window.innerWidth * 0.6 || t.clientHeight < 260 || inFixed(t)) return null;
    return t;
  };
  document.addEventListener('scroll', e => {
    const t = scroller(e); if (!t) return;
    if (t.scrollTop > 700) { target = t; btn.classList.add('on'); clearTimeout(hideT); }
    else if (t === target) { btn.classList.remove('on'); }
  }, true);
  btn.addEventListener('click', () => {
    const t = target || document.scrollingElement;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
    try { t.scrollTo({top:0, behavior: reduce || document.documentElement.classList.contains('tech') ? 'auto' : 'smooth'}); } catch(e) { t.scrollTop = 0; }
  });
  const mount = () => document.body && document.body.appendChild(btn);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();

// ══════════ התקנה כאפליקציה (Android: חלון התקנה; iPhone: הוראות) ══════════
(function(){
  window.addEventListener('beforeinstallprompt', function(ev){ ev.preventDefault(); window.__installEvt = ev; });
  window.addEventListener('appinstalled', function(){ window.__installEvt = null; if (window.toast) window.toast('✅ האתר הותקן במכשיר'); });
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.canInstallApp = () => !standalone() && (!!window.__installEvt || isIOS());
  window.installApp = async function(){
    if (window.__installEvt) {
      try { window.__installEvt.prompt(); await window.__installEvt.userChoice; } catch(e) {}
      window.__installEvt = null;
    } else if (isIOS()) {
      if (window.toast) window.toast('באייפון: לחצו על כפתור השיתוף בספארי ואז "הוסף למסך הבית"');
    }
  };
})();
