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
  'טיפ: ניתן לחפש לפי מק"ט יצרן, מק"ט תדיראן, שם חלק בעברית או באנגלית',
  'טיפ: לחץ על שורה בטבלה לבחירתה ושלח בווצאפ בלחיצה אחת',
  'טיפ: החיפוש החכם סולח על שגיאות כתיב קטנות',
  'טיפ: לחץ ⭐ כדי לשמור דגם במועדפים לגישה מהירה',
  'טיפ: השתמש בכפתור 📱 לתצוגה מותאמת לנייד',
  'טיפ: לחץ 🛒 כדי להוסיף חלקים לסל ולשלוח ביחד',
];

const DEFAULT_DISCLAIMER = '⚠️ יש לבדוק פיזית שהמק"ט תואם לחלק לפני הזמנה. המידע במערכת הוא לעיון בלבד ואינו מהווה אחריות. במקרה של אי-התאמה, לחץ על "דווח שגיאה".';

// Default users list — admin can add/remove/rename
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
