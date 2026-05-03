import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

const size = 1024
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')

// Background gradient
const bg = ctx.createLinearGradient(0, 0, size, size)
bg.addColorStop(0, '#0891b2')
bg.addColorStop(0.5, '#6366f1')
bg.addColorStop(1, '#8b5cf6')
ctx.fillStyle = bg
ctx.fillRect(0, 0, size, size)

// Background circles
ctx.fillStyle = 'rgba(255,255,255,0.08)'
ctx.beginPath()
ctx.arc(900, -100, 600, 0, Math.PI * 2)
ctx.fill()

ctx.fillStyle = 'rgba(255,255,255,0.06)'
ctx.beginPath()
ctx.arc(-100, 1000, 500, 0, Math.PI * 2)
ctx.fill()

ctx.fillStyle = 'rgba(251,191,36,0.15)'
ctx.beginPath()
ctx.arc(150, 200, 200, 0, Math.PI * 2)
ctx.fill()

// Outer glow ring
ctx.strokeStyle = 'rgba(255,255,255,0.25)'
ctx.lineWidth = 4
ctx.beginPath()
ctx.arc(512, 440, 300, 0, Math.PI * 2)
ctx.stroke()

ctx.strokeStyle = 'rgba(255,255,255,0.15)'
ctx.lineWidth = 2
ctx.beginPath()
ctx.arc(512, 440, 260, 0, Math.PI * 2)
ctx.stroke()

// Center circle
ctx.fillStyle = 'rgba(255,255,255,0.12)'
ctx.beginPath()
ctx.arc(512, 440, 220, 0, Math.PI * 2)
ctx.fill()
ctx.strokeStyle = 'rgba(255,255,255,0.35)'
ctx.lineWidth = 3
ctx.stroke()

// Main chat bubble
const drawRoundRect = (x, y, w, h, r, fill, stroke) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}

// Shadow for bubbles
ctx.shadowColor = 'rgba(0,0,0,0.3)'
ctx.shadowBlur = 30
ctx.shadowOffsetY = 10

// Main bubble (white)
drawRoundRect(360, 350, 230, 130, 20, 'rgba(255,255,255,0.95)')

// Secondary bubble (lighter)
drawRoundRect(440, 260, 170, 100, 20, 'rgba(255,255,255,0.75)')

ctx.shadowColor = 'transparent'
ctx.shadowBlur = 0
ctx.shadowOffsetY = 0

// Chat lines in main bubble
const lineGrad = ctx.createLinearGradient(380, 0, 570, 0)
lineGrad.addColorStop(0, '#0891b2')
lineGrad.addColorStop(1, '#6366f1')

ctx.fillStyle = lineGrad
ctx.beginPath(); ctx.roundRect(380, 380, 140, 14, 7); ctx.fill()
ctx.beginPath(); ctx.roundRect(380, 402, 100, 12, 6); ctx.fill()
ctx.beginPath(); ctx.roundRect(380, 422, 120, 12, 6); ctx.fill()

// Chat lines in secondary bubble
const lineGrad2 = ctx.createLinearGradient(460, 0, 590, 0)
lineGrad2.addColorStop(0, '#6366f1')
lineGrad2.addColorStop(1, '#8b5cf6')

ctx.fillStyle = lineGrad2
ctx.beginPath(); ctx.roundRect(460, 288, 110, 12, 6); ctx.fill()
ctx.beginPath(); ctx.roundRect(460, 308, 80, 10, 5); ctx.fill()

// AI Badge (top left)
const aiBg = ctx.createLinearGradient(100, 160, 200, 200)
aiBg.addColorStop(0, '#fbbf24')
aiBg.addColorStop(1, '#f59e0b')
drawRoundRect(100, 160, 120, 54, 16, null)
ctx.fillStyle = aiBg
ctx.fill()
ctx.fillStyle = 'white'
ctx.font = 'bold 36px Arial'
ctx.textAlign = 'center'
ctx.fillText('AI', 160, 197)

// Shekel Badge (top right)
ctx.beginPath()
ctx.arc(880, 185, 50, 0, Math.PI * 2)
ctx.fillStyle = '#fbbf24'
ctx.fill()
ctx.fillStyle = 'white'
ctx.font = 'bold 44px Arial'
ctx.textAlign = 'center'
ctx.fillText('₪', 880, 202)

// Lightning bolt
ctx.fillStyle = 'rgba(255,255,255,0.9)'
ctx.font = '64px Arial'
ctx.textAlign = 'center'
ctx.fillText('⚡', 820, 120)

// People icon
ctx.fillText('👥', 200, 120)

// Title text
ctx.fillStyle = 'white'
ctx.font = 'bold 88px Arial'
ctx.textAlign = 'center'
ctx.shadowColor = 'rgba(0,0,0,0.4)'
ctx.shadowBlur = 20
ctx.fillText('ניתוק', 430, 750)

const titleGrad = ctx.createLinearGradient(450, 700, 750, 850)
titleGrad.addColorStop(0, '#fbbf24')
titleGrad.addColorStop(1, '#f59e0b')
ctx.fillStyle = titleGrad
ctx.fillText('בקליק', 680, 750)

ctx.shadowBlur = 0

// Subtitle
ctx.fillStyle = 'rgba(255,255,255,0.85)'
ctx.font = '36px Arial'
ctx.textAlign = 'center'
ctx.fillText('קהילה חכמה • חוסכת כסף', 512, 820)

// Small decorative dots
for (let i = 0; i < 8; i++) {
  const x = 150 + Math.random() * 700
  const y = 50 + Math.random() * 900
  const r = 3 + Math.random() * 6
  ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.2})`
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// Save
const buffer = canvas.toBuffer('image/png')
writeFileSync('public/nituk-logo-1024.png', buffer)
console.log('✅ Logo saved to public/nituk-logo-1024.png')
