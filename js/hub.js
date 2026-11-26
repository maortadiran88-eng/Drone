// ══════════ מרכז ניהול — כל כלי הניהול במקום אחד, עם הסברים ומונים חיים ══════════
function ManagementHub({role, data, saving, localMode, counts, onOpen, onClose}){
  const admin = role === 'admin';
  const stats = useMemo(() => backupStats(data), [data]);
  const issues = useMemo(() => admin ? qualityScan(data).length : 0, [data, admin]);
  const [trashN, setTrashN] = useState(null);
  useEffect(() => { if (admin && !localMode) trashList().then(l => setTrashN(l.length)).catch(() => {}); }, []);
  const last = Number((() => { try { return localStorage.getItem('ac_last_backup') || 0; } catch(e) { return 0; } })());
  const backupDays = last ? Math.floor((Date.now() - last) / 864e5) : null;

  const groups = [
    {title:'תוכן ועריכה', items:[
      {k:'brands-edit', icon:'📁', title:'עריכת סרגל המותגים', desc:'הוספה, שינוי שם, הזזה (▲▼) ומחיקה של מותגים, קטגוריות ודגמים', admin:true},
      {k:'brandmgr', icon:'🏷️', title:'ניהול מותגים', desc:'הוספת מותג, שם, צבע והסתרה מצופים', admin:true},
      {k:'findreplace', icon:'🔎', title:'חיפוש והחלפה', desc:'תיקון טקסט או מק"ט בכל הקטלוג בבת אחת, עם תצוגה מקדימה'},
      {k:'xls', icon:'📥', title:'ייבוא מ-Excel', desc:'הוספת חלקים לדגם מקובץ אקסל'},
      {k:'bulkmove', icon:'🔀', title:'העברה גורפת', desc:'העברת כמה דגמים לקטגוריה אחרת', admin:true},
      {k:'bulkdel', icon:'🧹', title:'מחיקה גורפת', desc:'מחיקת כמה דגמים (נשמרים בסל המחזור)', admin:true},
    ]},
    {title:'בטיחות ושחזור', items:[
      {k:'undo', icon:'↶', title:'ביטול פעולה אחרונה', desc:'מבטל כל שינוי אחרון (גם Ctrl+Z). ביצוע מחדש: Ctrl+Y'},
      {k:'trash', icon:'🗑️', title:'סל מחזור', desc:'שחזור דגמים וקטגוריות שנמחקו (30 יום)', admin:true, badge: trashN},
      {k:'history', icon:'🕐', title:'היסטוריה / גרסאות', desc:'שחזור הקטלוג למצב קודם', admin:true},
      {k:'backup', icon:'💾', title:'גיבוי ועבודה במחשב', desc:'הורדת גיבוי מלא (ZIP) ועבודה גם כשהשרת לא זמין', admin:true,
        note: backupDays === null ? 'עדיין לא נעשה גיבוי' : backupDays > 14 ? 'לפני ' + backupDays + ' ימים' : '', warn: backupDays === null || backupDays > 14},
      {k:'quality', icon:'🧪', title:'בדיקת איכות נתונים', desc:'דגמים בלי חלקים או שרטוטים, מק"טים חסרים או כפולים', admin:true, badge: issues, warn: issues > 0},
      {k:'makat', icon:'✅', title:'בדיקת מק"טים', desc:'אישור ובדיקת שינויי מק"טים', admin:true},
    ]},
    {title:'משתמשים והרשאות', items:[
      {k:'users', icon:'👥', title:'ניהול משתמשים', desc:'הוספת משתמשים, תפקידים (צופה / עורך / מנהל) וסיסמאות', admin:true},
      {k:'pwd', icon:'🔑', title:'שינוי סיסמה', desc:'שינוי הסיסמה שלך', admin:true},
    ]},
    {title:'תקשורת ותוכן האתר', items:[
      {k:'notif', icon:'🔔', title:'התראות ובקשות', desc:'דיווחי שגיאות מצופים ובקשות להוספת דגמים', badge: counts.open, warn: counts.open > 0},
      {k:'news', icon:'📰', title:'שורת חדשות', desc:'הטקסט הרץ בראש האתר', admin:true},
      {k:'broadcast', icon:'📢', title:'הודעת מערכת', desc:'הודעה שתוצג לכל המשתמשים', admin:true},
      {k:'tips', icon:'💡', title:'טיפים', desc:'הטיפים שמוצגים בדף הבית', admin:true},
      {k:'dashboard', icon:'📊', title:'דשבורד', desc:'סטטיסטיקות שימוש בקטלוג', admin:true},
    ]},
  ].map(g => ({...g, items: g.items.filter(it => admin || !it.admin)})).filter(g => g.items.length);

  return (
    <Modal wide onClose={onClose} title="🧭 מרכז ניהול">
      <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14}}>
        <span className="badge" style={{background:'var(--primary-light)', color:'var(--primary)'}}>{stats.brands} מותגים · {stats.models} דגמים · {stats.parts.toLocaleString()} חלקים · {stats.images} שרטוטים</span>
        <span className="badge" style={{background: localMode ? 'var(--orange-bg)' : 'var(--primary-light)', color: localMode ? 'var(--orange)' : 'var(--primary)'}}>{localMode ? '🖥️ מצב עבודה מקומית' : '☁️ מחובר לשרת'}</span>
        <span className="badge" style={{background:'var(--primary-light)', color:'var(--primary)'}}>{saving === 'saving' ? 'שומר…' : saving === 'error' ? 'שגיאת שמירה' : saving === 'dirty' ? 'שינויים ממתינים לשמירה' : '✓ הכול שמור'}</span>
      </div>
      {groups.map(g => (
        <div key={g.title} style={{marginBottom:16}}>
          <div style={{fontWeight:800, fontSize:13, color:'var(--sub)', marginBottom:8, letterSpacing:'.03em'}}>{g.title}</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:10}}>
            {g.items.map(it => (
              <button key={it.k} onClick={() => { onClose(); onOpen(it.k); }}
                style={{textAlign:'right', display:'flex', gap:10, alignItems:'flex-start', padding:'12px 14px', borderRadius:16, border:'1px solid ' + (it.warn ? 'var(--orange)' : 'var(--border)'), background:'var(--card2)', color:'var(--text)', cursor:'pointer', fontFamily:'inherit', minHeight:76}}>
                <span style={{fontSize:22, lineHeight:1.1, flexShrink:0}}>{it.icon}</span>
                <span style={{flex:1, minWidth:0}}>
                  <b style={{display:'block', fontSize:14}}>{it.title}{it.badge ? <span className="badge" style={{marginInlineStart:8, background: it.warn ? 'var(--orange-bg)' : 'var(--primary-light)', color: it.warn ? 'var(--orange)' : 'var(--primary)'}}>{it.badge}</span> : null}</b>
                  <span className="tc-meta" style={{display:'block', lineHeight:1.5, marginTop:2}}>{it.desc}</span>
                  {it.note ? <span className="tc-meta" style={{display:'block', color:'var(--orange)', marginTop:2}}>{it.note}</span> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{textAlign:'left'}}><button className="btn btn-secondary" onClick={onClose}>סגור</button></div>
    </Modal>
  );
}
