# סיכום פרויקט צ'אט קהילתי - חיבור וניתוק בקליק

## מטרת הפרויקט
יצירת צ'אט קהילתי שרץ בתוך WordPress Elementor HTML Widget, מחובר ל-Supabase ותומך בשליחת קוד אימות למייל.

---

## קבצים עיקריים

### 1. קובץ ה-HTML להטמעה ב-Elementor
**נתיב:** `/public/nituk-elementor.html`

### 2. API Routes (רצים על Vercel)
- `/app/api/send-otp/route.ts` - שליחת קוד אימות למייל
- `/app/api/verify-otp/route.ts` - אימות הקוד

---

## פרטי חיבור

### Supabase
```
URL: https://wbjofameqaftxricclmd.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiam9mYW1lcWFmdHhyaWNjbG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTI0MTcsImV4cCI6MjA5MzA2ODQxN30.x_9XRxjDBpiZpASt6Xb_SJk1lgntPzzPFucamaumfhY
```

### API Base (צריך לעדכן לכתובת האמיתית)
```
API_BASE: https://v0-chat-psi.vercel.app/api
```

### מייל מנהל (נכנס ישירות ללא אימות)
```
ADMIN_EMAIL: arielgabayyy@gmail.com
```

---

## סכמת בסיס הנתונים

### טבלת chat_users
```sql
- id: uuid (primary key)
- name: text
- email: text (nullable)
- avatar_color: text
- user_type: enum ('guest', 'subscriber', 'newsletter', 'admin')
- is_online: boolean
- last_seen: timestamptz
- messages_count: integer
- points: integer
- level: integer
- warning_count: integer
- created_at: timestamptz
```

### טבלת chat_messages
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key -> chat_users.id)
- content: text
- created_at: timestamptz
```

### טבלת otp_codes
```sql
- id: uuid (primary key)
- email: text
- code: text (6 ספרות)
- expires_at: timestamptz
- verified: boolean
- created_at: timestamptz
```

### טבלת muted_users
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key -> chat_users.id)
- muted_until: timestamptz
- muted_by: uuid
- reason: text
- created_at: timestamptz
```

### טבלת banned_users
```sql
- id: uuid (primary key)
- user_id: uuid (nullable)
- email: text
- banned_by: uuid
- reason: text
- banned_at: timestamptz
```

---

## פיצ'רים

### כניסה
1. **כניסה כאורח** - שם + בחירת צבע, נכנס ישירות
2. **כניסת מנויים** - שם + מייל + בחירת צבע, דורש קוד אימות 6 ספרות
3. **כניסת מנהל** - מייל arielgabayyy@gmail.com נכנס ישירות ללא אימות

### צ'אט
- שליחת הודעות בזמן אמת (Realtime)
- אמוג'ים (20 אמוג'ים פופולריים)
- חיפוש הודעות
- הצגת מספר מחוברים
- שמירת משתמש ב-localStorage (זוכר גם אחרי רענון)

### ניהול (למנהל בלבד)
- **פרופיל משתמש** - לחיצה על אווטאר פותחת פרופיל
- **שליחת אזהרה** - מעלה מונה warning_count
- **השתקה** - מונע שליחת הודעות לשעה
- **חסימה** - מונע כניסה לצ'אט
- **פאנל ניהול** - צפייה במושתקים/חסומים והסרה

---

## בעיות ידועות שצריך לטפל

### 1. שליחת מייל אמיתית
ה-API מוגדר לשלוח מייל דרך Resend או SendGrid, אבל צריך להגדיר environment variables:
```
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```
או
```
SENDGRID_API_KEY=SG.xxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**ללא הגדרת משתנים - הקוד יוצג ב-toast (מצב פיתוח)**

### 2. API_BASE
צריך לעדכן את `API_BASE` בקובץ HTML לכתובת ה-Vercel הנכונה של הפרויקט.

### 3. CORS
אם יש בעיות CORS, צריך להוסיף headers ל-API routes:
```typescript
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
```

---

## הנחיות להטמעה ב-WordPress Elementor

### שלב 1: העתקת הקוד
1. פתח את `/public/nituk-elementor.html`
2. העתק את כל התוכן

### שלב 2: הגדרת Elementor
1. ערוך את העמוד ב-Elementor
2. גרור widget של "HTML"
3. הדבק את הקוד
4. הגדר לקונטיינר גובה מינימלי של 600px

### שלב 3: עדכון הגדרות
בתחילת הקוד (שורות 5-8), עדכן:
```javascript
var SUPABASE_URL='https://wbjofameqaftxricclmd.supabase.co';
var SUPABASE_KEY='eyJhbGci...';
var ADMIN_EMAIL='arielgabayyy@gmail.com';
var API_BASE='https://YOUR-VERCEL-URL.vercel.app/api';  // <-- עדכן!
```

---

## חוקים ל-WordPress Elementor HTML Widget

### CSS
- כל selector חייב להתחיל ב-`#nkChat`
- להשתמש ב-`!important` בכל מקום
- לא להשתמש ב-`all:revert` או `all:initial`
- לא להשתמש ב-`position:fixed` - רק `absolute`
- גובה: `85svh` למחשב, `100dvh` למובייל
- `font-size:16px` לכל inputs (מונע zoom ב-iOS)
- tap targets מינימום 44px

### JavaScript
- לעטוף הכל ב-IIFE
- להשתמש ב-`var` במקום `let/const`
- לא להשתמש ב-arrow functions
- לא להשתמש ב-`alert()` או `confirm()` - רק toast
- namespace ייחודי (`NK`)
- localStorage keys עם prefix (`nitkuk_`)
- cleanup ב-`beforeunload`

---

## קוד ה-HTML המלא

```html
<div id="nkChat"></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
(function(){
  var SUPABASE_URL='https://wbjofameqaftxricclmd.supabase.co';
  var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiam9mYW1lcWFmdHhyaWNjbG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTI0MTcsImV4cCI6MjA5MzA2ODQxN30.x_9XRxjDBpiZpASt6Xb_SJk1lgntPzzPFucamaumfhY';
  var ADMIN_EMAIL='arielgabayyy@gmail.com';
  var API_BASE='https://v0-chat-psi.vercel.app/api';
  // ... (ראה קובץ מלא ב-/public/nituk-elementor.html)
})();
</script>
```

---

## API Routes

### POST /api/send-otp
**בקשה:**
```json
{"email": "user@example.com"}
```

**תשובה (הצלחה):**
```json
{"success": true, "message": "קוד נשלח למייל"}
```

**תשובה (מצב פיתוח - ללא שירות מייל):**
```json
{"success": true, "message": "קוד אימות", "devCode": "123456", "devMode": true}
```

### POST /api/verify-otp
**בקשה:**
```json
{"email": "user@example.com", "code": "123456"}
```

**תשובה (הצלחה):**
```json
{"success": true, "verified": true}
```

**תשובה (שגיאה):**
```json
{"error": "קוד שגוי או פג תוקף"}
```

---

## תרשים זרימה

```
מסך פתיחה
    │
    ├── כניסה כאורח
    │       └── הזן שם + בחר צבע → כניסה לצ'אט
    │
    └── כניסת מנויים
            │
            ├── מייל מנהל → כניסה ישירה לצ'אט (עם הרשאות מנהל)
            │
            └── מייל רגיל → שליחת OTP למייל
                    │
                    └── הזנת קוד 6 ספרות
                            │
                            ├── קוד נכון → כניסה לצ'אט
                            │
                            └── קוד שגוי → "קוד שגוי או פג תוקף"
```

---

## צריך עזרה?

1. **בדיקת API** - גש ל-`https://YOUR-VERCEL-URL.vercel.app/api/send-otp` עם POST request
2. **בדיקת Supabase** - פתח את הדשבורד ב-supabase.com ובדוק את הטבלאות
3. **Console errors** - פתח DevTools (F12) ובדוק שגיאות בקונסול
