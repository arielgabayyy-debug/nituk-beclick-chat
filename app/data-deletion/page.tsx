export default function DataDeletionPage() {
  return (
    <div dir="rtl" style={{ fontFamily: 'Arial', maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: 1.8 }}>
      <h1 style={{ color: '#0891b2', marginBottom: 20 }}>מחיקת נתונים - ניתוק בקליק</h1>

      <h2>כיצד למחוק את הנתונים שלך?</h2>
      <p>אם הצטרפת דרך Facebook Login ותרצה למחוק את הנתונים שלך מהמערכת שלנו:</p>

      <ol style={{ marginTop: 16, paddingRight: 20 }}>
        <li style={{ marginBottom: 12 }}>שלח אימייל לכתובת: <a href="mailto:nitukbeclick@gmail.com">nitukbeclick@gmail.com</a></li>
        <li style={{ marginBottom: 12 }}>ציין את שמך ואימייל הפייסבוק שלך</li>
        <li style={{ marginBottom: 12 }}>תוך 7 ימי עסקים נמחק את כל הנתונים שלך</li>
      </ol>

      <p style={{ marginTop: 24 }}>הנתונים שנמחקים כוללים: שם, אימייל, הודעות, ונקודות.</p>

      <p style={{ marginTop: 40, color: '#94a3b8', fontSize: 14 }}>
        © 2026 ניתוק בקליק | <a href="/privacy">מדיניות פרטיות</a>
      </p>
    </div>
  )
}
