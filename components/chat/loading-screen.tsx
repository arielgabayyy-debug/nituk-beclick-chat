"use client"

export function LoadingScreen({ message = "הצ׳אט הקהילתי טוען..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 50%, #fdf4ff 100%)' }}>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full opacity-40"
          style={{ background: 'rgba(8,145,178,0.15)', filter: 'blur(80px)', top: '-100px', right: '-100px', animation: 'blob-move 8s ease-in-out infinite' }} />
        <div className="absolute w-72 h-72 rounded-full opacity-40"
          style={{ background: 'rgba(139,92,246,0.15)', filter: 'blur(80px)', bottom: '-50px', left: '-50px', animation: 'blob-move 10s ease-in-out infinite reverse' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Logo with pulse rings */}
        <div className="relative" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-3xl" style={{ margin: '-12px' }}>
            {[0, 0.5, 1].map((delay, i) => (
              <div key={i} className="absolute inset-0 rounded-3xl border-2"
                style={{ borderColor: 'rgba(8,145,178,0.4)', animation: `pulse-ring 2s ease-out ${delay}s infinite` }} />
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/vercel/share/v0-project/public/community-logo-v2-rWt6MTkHzsU1rzhKMX9iaY3puwHh2U.jpg"
            alt="ניתוק בקליק"
            className="w-24 h-24 rounded-2xl shadow-2xl relative z-10"
          />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold gradient-text">חיבור וניתוק בקליק</h1>
          <p className="text-sm text-muted-foreground mt-1">הקהילה הכי חוסכת בישראל 🇮🇱</p>
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-emerald-500 rounded-full pulse-online" />
          <span>{message}</span>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(8,145,178,0.15)' }}>
          <div className="h-full rounded-full" style={{
            background: 'linear-gradient(90deg, #0891b2, #8b5cf6)',
            animation: 'progress-bar 1.8s ease-in-out infinite'
          }} />
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #8b5cf6)',
                animation: `bounce-dot 1.4s ease-in-out ${delay}s infinite`
              }} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes blob-move {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes progress-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
