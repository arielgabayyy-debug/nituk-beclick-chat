"use client"

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      {/* Message from other */}
      {[0.6, 0.8, 0.5, 0.7, 0.4].map((width, i) => (
        <div key={i} className={`flex gap-3 ${i % 3 === 2 ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex flex-col gap-1.5 max-w-[55%]">
            <div className="h-2 bg-muted rounded w-20" />
            <div className="bg-muted rounded-2xl px-4 py-3" style={{ width: `${width * 220 + 60}px`, height: `${Math.random() * 20 + 40}px` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
