"use client"

import { useState } from 'react'
import { BarChart3, Check, Users, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Poll, ChatUser } from '@/lib/chat-types'
import { formatTimeAgo } from '@/lib/chat-types'

interface PollCardProps {
  poll: Poll
  currentUser: ChatUser | null
  onVote: (pollId: string, optionId: string) => void
}

export function PollCard({ poll, currentUser, onVote }: PollCardProps) {
  const hasVoted = !!poll.user_voted_option
  const totalVotes = poll.total_votes || 0

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shrink-0">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground text-lg leading-tight">{poll.question}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalVotes} הצבעות
              </span>
              {poll.creator && (
                <span>נוצר ע״י {poll.creator.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        {poll.options?.map((option) => {
          const isSelected = poll.user_voted_option === option.id
          const percentage = option.percentage || 0

          return (
            <button
              key={option.id}
              onClick={() => !hasVoted && onVote(poll.id, option.id)}
              disabled={hasVoted}
              className={cn(
                "w-full relative overflow-hidden rounded-xl border-2 transition-all duration-300",
                hasVoted
                  ? isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/50 bg-muted/30"
                  : "border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              )}
            >
              {/* Progress bar */}
              {hasVoted && (
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    isSelected ? "bg-primary/20" : "bg-muted/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/50"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className={cn(
                    "font-medium",
                    isSelected && "text-primary"
                  )}>
                    {option.option_text}
                  </span>
                </div>
                {hasVoted && (
                  <span className={cn(
                    "font-bold text-sm",
                    isSelected && "text-primary"
                  )}>
                    {percentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      {!hasVoted && (
        <div className="px-4 pb-4">
          <p className="text-xs text-center text-muted-foreground">
            לחץ על אפשרות כדי להצביע
          </p>
        </div>
      )}
    </div>
  )
}

interface CreatePollFormProps {
  onSubmit: (question: string, options: string[]) => void
  onCancel: () => void
}

export function CreatePollForm({ onSubmit, onCancel }: CreatePollFormProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = () => {
    const validOptions = options.filter(o => o.trim())
    if (question.trim() && validOptions.length >= 2) {
      onSubmit(question.trim(), validOptions)
    }
  }

  return (
    <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-4 space-y-4">
      <h3 className="font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        יצירת סקר חדש
      </h3>

      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="מה השאלה שלך?"
        className="bg-background/50"
      />

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`אפשרות ${index + 1}`}
              className="bg-background/50"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
                className="shrink-0 text-destructive"
              >
                ×
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <Button
          variant="outline"
          size="sm"
          onClick={addOption}
          className="w-full"
        >
          <Plus className="h-4 w-4 ml-1" />
          הוסף אפשרות
        </Button>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} className="flex-1">
          צור סקר
        </Button>
        <Button variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  )
}
