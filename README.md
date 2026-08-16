# שיטת מיכו — אפליקציית ניהול ואיתור טריידים

אפליקציית Web לסריקת מניות וניהול פוזיציות לפי שיטת מסחר מבוססת MA150
("שיטת מיכו"). כל הלוגיקה מרוכזת במודול יחיד: `src/lib/trading-engine.ts`.

**חשוב:** האתר אינו ממציא נתוני שוק. כל מחיר, Volume ו-MA150 מגיע מ-API
חיצוני אמיתי. בלי מפתח API — האתר יציג "אין נתונים מספיקים" בכל מקום
שדורש נתוני שוק, ולא יציג אף אות מסחר.

## התקנה (Installation)

```bash
cd michu-trading-app
npm install
```

## משתני סביבה (Environment Variables)

העתק את `.env.example` ל-`.env` ומלא:

```bash
cp .env.example .env
```

- `DATABASE_URL` — כברירת מחדל משתמשים ב-SQLite (`file:./dev.db`), לא נדרש
  שרת DB נפרד. ניתן לשדרג ל-PostgreSQL בפרודקשן (ראה `prisma/schema.prisma`).
- `MARKET_DATA_API_KEY` — מפתח API מ-[Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs)
  (יש חבילה חינמית עם הגבלת קריאות). זהו הספק שסופק לנתוני מחירים, נפח
  ורשימות S&P 500 / Nasdaq-100. ניתן להחליף ספק ע"י עריכת
  `src/lib/market-data-provider.ts` בלבד — שאר האפליקציה לא תלויה בספק ספציפי.

## הגדרת מסד נתונים (Database Setup)

```bash
npm run db:push      # יוצר את קובץ ה-SQLite לפי הסכימה
npm run db:generate   # מייצר את Prisma Client
```

לצפייה בנתונים בממשק גרפי: `npm run db:studio`

## הגדרת נתוני שוק (Market Data Setup)

1. הירשם ל-Financial Modeling Prep וקבל מפתח API חינמי.
2. הכנס אותו ל-`.env` תחת `MARKET_DATA_API_KEY`.
3. עלה את השרת (ראה למטה), עבור לעמוד "סריקת מניות" ולחץ
   "סנכרן רשימת מדדים עדכנית" כדי לשלוף את רשימות S&P 500 ו-Nasdaq-100
   האמיתיות.
4. לחץ "רענן נתוני שוק" בדף הראשי כדי לשלוף מחירים, Volume ו-MA150 בפועל.

## הרצה מקומית (Running Locally)

```bash
npm run dev
```

האתר יעלה על http://localhost:3000

## פריסה לאינטרנט (Deployment) — כדי שהאתר יעבוד בכתובת אמיתית

**חשוב:** SQLite (קובץ מקומי) לא עובד בפריסת Vercel/Serverless — הקובץ לא
נשמר בין קריאות. לפני פריסה צריך מסד PostgreSQL אמיתי (יש אפשרויות חינמיות).

### שלבים (Vercel + Neon, שניהם עם חבילה חינמית):

1. **צור מסד PostgreSQL חינמי:**
   - היכנס ל-[neon.tech](https://neon.tech) → צור פרויקט חדש → העתק את ה-
     Connection String (`postgresql://...`).

2. **שנה את הספק בסכימה** — פתח את `prisma/schema.prisma` ושנה:
   ```prisma
   datasource db {
     provider = "postgresql"   // במקום "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   שמור ועשה commit לשינוי הזה.

3. **חבר את הפרויקט ל-Vercel:**
   - היכנס ל-[vercel.com](https://vercel.com) → "Add New Project" → בחר את
     ה-repo מ-GitHub (ראה הוראות ההעלאה למטה) → Import.

4. **הגדר משתני סביבה ב-Vercel** (Settings → Environment Variables):
   - `DATABASE_URL` = ה-Connection String מ-Neon
   - `MARKET_DATA_API_KEY` = מפתח ה-API שלך מ-Financial Modeling Prep

5. **לחץ Deploy.** ה-`postinstall` script כבר מריץ `prisma generate`
   אוטומטית בכל build.

6. **צור את הטבלאות במסד הפרודקשן** (פעם אחת, מהמחשב שלך):
   ```bash
   DATABASE_URL="הכתובת מ-Neon" npx prisma db push
   ```

7. גלוש לכתובת ש-Vercel נתן לך — האתר אמור לעבוד. עבור לעמוד "סריקת מניות"
   ולחץ "סנכרן רשימת מדדים עדכנית" כדי לטעון נתונים אמיתיים בפעם הראשונה.

## מבנה הפרויקט

```
src/
  app/              # דפים ו-API routes (Next.js App Router)
  lib/
    trading-engine.ts        # *** כל לוגיקת שיטת מיכו - כאן בלבד ***
    market-data-provider.ts  # שכבת גישה יחידה לנתוני שוק אמיתיים
    db.ts, config-defaults.ts
  components/
prisma/schema.prisma          # סכימת מסד הנתונים
```

## מגבלות גרסה זו (MVP)

- אין מסך התחברות (Auth) — מיועד לשימוש אישי יחיד. ניתן להוסיף NextAuth
  בהמשך אם נדרשת גישה מרובת משתמשים.
- הבדיקה ההיסטורית (Backtest) היא מודל מפושט: כניסה ביום הסגירה, בדיקת
  יציאה לפי מגע ב-Low היומי מול ה-Stop. אין בה סימולציה של כל תנאי השוק
  בפועל (למשל Gaps גדולים, נזילות בזמן אמת).
- מוגבל לספק הנתונים Financial Modeling Prep כברירת מחדל. שינוי ספק דורש
  עריכת קובץ אחד בלבד: `market-data-provider.ts`.

## הצהרה

האתר הוא כלי עזר לניתוח וניהול סיכונים בלבד. אין הוא מהווה ייעוץ השקעות
ואינו מבטיח רווח. כל אות מבוסס על כללים שהוגדרו מראש בעמוד ההגדרות.
