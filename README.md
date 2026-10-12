# קטלוג חלקי חילוף — VRF Parts Catalog

## מבנה הקבצים

```
📁 catalog/
  index.html          ← נקודת כניסה (CDN imports + Firebase init)
  README.md
  📁 js/
    constants.js      ← קבועים, INIT, DCOLS, DCATS
    firebase.js       ← כל קריאות Firebase (fbLoad, fbSave, fbHist …)
    helpers.js        ← פונקציות עזר + Modal + style atoms
    components.js     ← LoginScreen, HomeScreen, SidebarBrand, CartPanel, NotificationsPanel
    modals.js         ← WaEditorModal, MoveModal, CopyPartsModal, BulkMove/Delete, XlsImport, BrandMgr, ChangePwd
    ModelView.js      ← טבלת החלקים המלאה + מצב נייד
    App.js            ← קומפוננטת הבסיס, state, ניתוב, Firebase auto-save
```

## העלאה ל-GitHub Pages

1. העלה את כל התיקייה לריפוזיטורי GitHub
2. Settings → Pages → Branch: main / (root)
3. הכנס לכתובת `https://<username>.github.io/<repo>/`

## סיסמאות ברירת מחדל

| תפקיד | סיסמה |
|--------|--------|
| מנהל   | admin1234 |
| עורך   | editor1234 |
| צופה   | tadir123 |

> ניתן לשנות מההגדרות (🔑) לאחר כניסה כמנהל.

## Firebase

הפרויקט כבר מוגדר לחשבון Firebase של תדיראן.
לשינוי — ערוך את בלוק `firebase.initializeApp(...)` בתחילת `index.html`.
