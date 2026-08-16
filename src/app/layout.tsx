import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "שיטת מיכו - ניהול ואיתור טריידים",
  description: "כלי לסריקת מניות וניהול פוזיציות לפי שיטת מיכו (MA150)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-gray-50 min-h-screen text-gray-900">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-lg">שיטת מיכו</span>
            <div className="flex gap-1 text-sm flex-wrap">
              <Link href="/" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                ראשי
              </Link>
              <Link href="/scan" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                סריקת מניות
              </Link>
              <Link href="/positions" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                הפוזיציות שלי
              </Link>
              <Link href="/history" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                היסטוריה
              </Link>
              <Link href="/backtest" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                בדיקה היסטורית
              </Link>
              <Link href="/settings" className="px-3 py-2 rounded-lg hover:bg-gray-100">
                הגדרות
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-6 text-xs text-gray-400 text-center">
          כלי זה הוא עזר לניתוח וניהול סיכונים בלבד ואינו מהווה ייעוץ השקעות. כל
          אות מבוסס על כללים שהוגדרו מראש, ואינו מבטיח רווח.
        </footer>
      </body>
    </html>
  );
}
