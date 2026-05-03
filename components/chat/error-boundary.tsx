"use client"

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Chat Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold mb-2">משהו השתבש</h3>
          <p className="text-sm text-muted-foreground mb-4">אירעה שגיאה בטעינת הצ׳אט. נסה לרענן את הדף.</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            <RefreshCw className="w-4 h-4" />
            רענן עמוד
          </button>
          {this.state.error && (
            <details className="mt-4 text-left text-xs text-muted-foreground max-w-xs">
              <summary className="cursor-pointer">פרטי שגיאה</summary>
              <pre className="mt-2 bg-muted/50 rounded p-2 overflow-auto">{this.state.error.message}</pre>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
