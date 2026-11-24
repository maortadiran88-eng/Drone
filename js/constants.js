const {useState,useEffect,useRef,useMemo,useCallback} = React;

const SEP = '§';
const gid = () => Math.random().toString(36).substr(2, 9);

const DCOLS = () => [
  {id:'ref',    name:'מספר זיהוי'},
  {id:'nameHe', name:'שם בעברית'},
  {id:'nameEn', name:'Part Name'},
  {id:'mfgPn',  name:'מק"ט יצרן'},
  {id:'tadPn',  name:'מק"ט תדיראן'}
];

const DCATS = () => [
  {id:gid(), name:'יחידה פנימית',  models:[]},
  {id:gid(), name:'יחידה חיצונית', models:[]},
  {id:gid(), name:'חימום מים',     models:[]},
  {id:gid(), name:'בקרים',         models:[]},
];

const DEFAULT_TIPS = [
  'טיפ: אפשר לחפש לפי מק"ט תדיראן, מק"ט יצרן, שם חלק בעברית או באנגלית',
  'טיפ: החיפוש סולח על שגיאות כתיב קטנות. התוצאה המדויקת ביותר מופיעה ראשונה',
  'טיפ: לחץ על שורה בטבלה כדי לבחור חלקים ולשלוח בוואטסאפ בלחיצה אחת',
  'טיפ: לחץ על 🛒 כדי להוסיף חלקים לסל ולשלוח או לייצא את כולם יחד',
  'טיפ: לחץ ⭐ כדי לשמור דגם במועדפים לגישה מהירה',
  'טיפ: כפתור "שיתוף" בדף דגם שולח קישור ישיר לדגם בוואטסאפ',
  'טיפ: בעבודה בשטח הפעל "מצב טכנאי" בתפריט ⋮ לתצוגה גדולה וברורה',
  'טיפ: האתר נפתח גם בלי קליטה, עם העותק האחרון שנשמר במכשיר',
];

const DEFAULT_DISCLAIMER = '⚠️ יש לבדוק פיזית שהמק"ט תואם לחלק לפני הזמנה. המידע במערכת הוא לעיון בלבד ואינו מהווה אחריות. במקרה של אי-התאמה, לחץ על "דווח שגיאה".';

// Default users list — admin can add/remove/rename

// ── כניסה שנשמרת במכשיר (בלי להקליד סיסמה בכל רענון) ──
const SESSION_DAYS = 2;   // כמה ימים נשארים מחוברים. לשינוי: מספר ימים (למשל 1)
function pwHash(s){ let h=0x811c9dc5; s=String(s==null?'':s); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(16); }
function saveSession(user, pwd){
  try { localStorage.setItem('ac_session', JSON.stringify({id:user.id, role:user.role, label:user.label, ts:Date.now(), sig:pwHash(pwd)})); } catch(e) {}
}
function clearSession(){ try { localStorage.removeItem('ac_session'); } catch(e) {} }
function restoreSession(users){
  try {
    const o = JSON.parse(localStorage.getItem('ac_session')||'null');
    if (!o || !o.ts || Date.now() - o.ts > SESSION_DAYS*864e5) { clearSession(); return null; }
    const u = (users||[]).find(x => x.id === o.id && x.role === o.role);
    // אם הסיסמה של המשתמש שונתה (או המשתמש נמחק) — הכניסה השמורה מתבטלת
    const cur = u ? (u.ph || pwHash(u.pass)) : null;
    if (!u || cur !== o.sig) { clearSession(); return null; }
    return {role:u.role, id:u.id, label:u.label};
  } catch(e) { return null; }
}

const DEFAULT_USERS = [
  {id:'admin',   label:'מנהל',   pass:'admin1234',   role:'admin'},
  {id:'editor1', label:'עורך 1', pass:'editor1234',  role:'editor'},
  {id:'editor2', label:'עורך 2', pass:'editor2222',  role:'editor'},
  {id:'viewer1', label:'צופה 1', pass:'tadir123',    role:'viewer'},
];

const INIT = () => ({
  users: DEFAULT_USERS,
  // Legacy fields kept for backward compat
  pass:'admin1234', editorPass:'editor1234', viewerPass:'tadir123',
  waDefaults:['nameHe','tadPn'],
  welcomeTitle:'ברוך הבא לקטלוג חלקי חילוף למערכות VRF',
  welcomeSub:'תחת המותג תדיראן',
  disclaimer:DEFAULT_DISCLAIMER,
  partsDisclaimer: DEFAULT_DISCLAIMER,
  tips: DEFAULT_TIPS,
  greetings:{morning:'🌅 בוקר טוב!',noon:'☀️ צהריים טובים!',evening:'🌆 ערב טוב!',night:'🌙 לילה טוב!'},
  systemMsg:null,
  brands:[
    {id:'gree', name:'GREE', color:'#1565c0', light:'#e3f2fd', categories:[
      {id:'gi0', name:'יחידה פנימית', models:[{
        id:'demo1', name:'GWH12ACC', synonyms:['GWH12ACC-K6DNA1A'], images:[], notes:'',
        columns:DCOLS(), parts:[
          {id:'dp1',values:{ref:'1',nameHe:'מנוע מאוורר',nameEn:'Fan Motor',mfgPn:'GM120023',tadPn:'TD-1001'},discontinued:false,tags:'מנוע,fan',pinned:false,comments:[]},
          {id:'dp2',values:{ref:'2',nameHe:'לוח אלקטרוני',nameEn:'Control Board',mfgPn:'CB340012',tadPn:'TD-1002'},discontinued:false,tags:'לוח,board',pinned:true,comments:[]},
        ]
      }]},
      {id:'gi1',name:'יחידה חיצונית',models:[]},{id:'gi2',name:'חימום מים',models:[]},{id:'gi3',name:'בקרים',models:[]},
    ]},
    {id:'toshiba',name:'TOSHIBA',color:'#c62828',light:'#ffebee',categories:[
      {id:'ti0',name:'יחידה פנימית',models:[]},{id:'ti1',name:'יחידה חיצונית',models:[]},{id:'ti2',name:'חימום מים',models:[]},{id:'ti3',name:'בקרים',models:[]},
    ]},
    {id:'prime',name:'PRIME',color:'#2e7d32',light:'#e8f5e9',categories:[
      {id:'pi0',name:'יחידה פנימית',models:[]},{id:'pi1',name:'יחידה חיצונית',models:[]},{id:'pi2',name:'חימום מים',models:[]},{id:'pi3',name:'בקרים',models:[]},
    ]},
  ]
});
