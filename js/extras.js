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
  // גלילה חלקה משלנו (rAF): עובדת בכל הטלפונים, גם כשהדפדפן מתעלם מ-behavior:'smooth'
  let anim = 0;
  const smoothTop = (el) => {
    cancelAnimationFrame(anim);
    const from = el.scrollTop; if (from <= 0) return;
    // פעולה שהמשתמש ביקש בלחיצה — תמיד חלקה (גם בהגדרת "הפחתת תנועה" או במצב טכנאי)
    const dur = Math.max(550, Math.min(1000, 450 + from / 4));
    const prev = el.style.scrollBehavior; el.style.scrollBehavior = 'auto';
    const root = document.documentElement, prevRoot = root.style.scrollBehavior; root.style.scrollBehavior = 'auto';
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);          // האטה רכה לקראת הסוף
    const done = () => { el.style.scrollBehavior = prev; root.style.scrollBehavior = prevRoot; };
    const stop = () => { cancelAnimationFrame(anim); done(); };
    el.addEventListener('touchstart', stop, {once:true, passive:true});
    el.addEventListener('wheel', stop, {once:true, passive:true});
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollTop = from * (1 - ease(p));
      if (p < 1) anim = requestAnimationFrame(step); else done();
    };
    anim = requestAnimationFrame(step);
  };
  btn.addEventListener('click', () => { smoothTop(target || document.scrollingElement); });
  const mount = () => document.body && document.body.appendChild(btn);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();

// ══════════ התקנה כאפליקציה (Android: חלון התקנה; iPhone: הוראות) ══════════
(function(){
  window.addEventListener('beforeinstallprompt', function(ev){ ev.preventDefault(); window.__installEvt = ev; });
  window.addEventListener('appinstalled', function(){ window.__installEvt = null; if (window.toast) window.toast('✅ האתר הותקן במכשיר'); });
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  window.canInstallApp = () => !standalone() && (!!window.__installEvt || isIOS() || isAndroid());
  window.installApp = async function(){
    if (window.__installEvt) {
      try {
        window.__installEvt.prompt();
        const r = await window.__installEvt.userChoice;
        if (r && r.outcome === 'accepted' && window.toast) window.toast('✅ האפליקציה הותקנה. הקיצור נוסף למסך הבית');
      } catch(e) {}
      window.__installEvt = null; hideBanner();
    } else if (isIOS()) {
      if (window.toast) window.toast('באייפון: לחצו על כפתור השיתוף בספארי ואז "הוסף למסך הבית"');
    } else if (window.toast) {
      window.toast('בכרום: לחצו על ⋮ בפינת הדפדפן ובחרו "התקנת אפליקציה" או "הוספה למסך הבית"');
    }
  };
  // באנר התקנה בלחיצה אחת (רק כשהדפדפן מאפשר התקנה; לא יותר מפעם בשבוע אחרי סגירה)
  let banner = null;
  const hideBanner = () => { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; };
  const showBanner = () => {
    try { if (Date.now() - Number(localStorage.getItem('ac_install_dismiss')||0) < 7*864e5) return; } catch(e) {}
    if (banner || standalone() || !window.__installEvt) return;
    banner = document.createElement('div'); banner.id = 'install-banner'; banner.setAttribute('role','dialog');
    banner.innerHTML = '<img src="icon-192.png" alt="" width="40" height="40"><div class="ib-t"><b>התקנת האפליקציה</b><span>קיצור במסך הבית וגישה מהירה</span></div><button class="ib-go" type="button">התקן</button><button class="ib-x" type="button" aria-label="סגור">✕</button>';
    banner.querySelector('.ib-go').onclick = () => window.installApp();
    banner.querySelector('.ib-x').onclick = () => { try { localStorage.setItem('ac_install_dismiss', String(Date.now())); } catch(e) {} hideBanner(); };
    document.body.appendChild(banner);
  };
  const ibcss = document.createElement('style');
  ibcss.textContent = `#install-banner{position:fixed;inset-inline:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:600;display:none;align-items:center;gap:10px;padding:10px 12px;border-radius:20px;direction:rtl;
    background:var(--card,#fff);color:var(--text,#0b1b3a);border:1px solid var(--border2,#cfd7e5);box-shadow:0 20px 50px -18px rgba(6,12,24,.55);font-family:var(--font,Heebo,Arial,sans-serif);max-width:520px;margin:0 auto}
    @media (max-width:720px){#install-banner{display:flex}}
    #install-banner img{border-radius:11px;flex-shrink:0}
    #install-banner .ib-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
    #install-banner .ib-t b{font-size:14px}#install-banner .ib-t span{font-size:12px;color:var(--sub,#5b6b86)}
    #install-banner .ib-go{border:0;border-radius:999px;padding:9px 18px;font:700 14px/1 inherit;font-family:inherit;color:#fff;cursor:pointer;background:var(--grad-brand,linear-gradient(120deg,#0a2a63,#1565c0 50%,#0fb8cf))}
    #install-banner .ib-x{border:0;background:transparent;color:var(--sub,#5b6b86);font-size:16px;padding:6px;cursor:pointer}`;
  document.head.appendChild(ibcss);
  window.addEventListener('beforeinstallprompt', () => setTimeout(showBanner, 4000));
})();
