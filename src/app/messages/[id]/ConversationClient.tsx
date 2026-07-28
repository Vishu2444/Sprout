'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { getInitials, timeAgo } from '@/lib/utils'
import { useMessages } from '@/hooks/use-messages'
import { ArrowLeft, Send, Loader2, Lock } from 'lucide-react'

export default function ConversationClient({
  conversationId,
  profile,
  otherProfile,
}: {
  conversationId: string
  profile: Profile
  otherProfile: Profile | null
}) {
  const { messages, loading, sending, e2eeReady, error, sendMessage, setError } = useMessages(
    conversationId,
    profile.id,
    otherProfile!,
  )
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || sending) return
    sendMessage(text)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <Link
          href="/messages"
          className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-alt transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {getInitials(otherProfile?.full_name || otherProfile?.username)}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-primary">
            {otherProfile?.full_name || otherProfile?.username || 'Unknown'}
          </h2>
          <p className="text-xs text-secondary flex items-center gap-1">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-secondary">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === profile.id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? 'bg-accent text-accent-on rounded-br-md'
                      : 'bg-surface-alt text-primary rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.decrypted}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-secondary'}`}>
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 pt-4 border-t border-border">
        {e2eeReady ? (
          <div className="flex items-center gap-2 bg-surface rounded-xl border border-border focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all duration-200">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent px-4 py-3 text-sm text-primary placeholder:text-secondary focus:outline-none"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="mr-2 p-2 rounded-lg bg-accent text-accent-on hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
<Loader2 className="w-5 h-5 text-accent animate-spin mx-auto mb-2" />
          <p className="text-sm text-secondary">Setting up end-to-end encryption...</p>
          </div>
        )}
      </div>
    </div>
  )
}
