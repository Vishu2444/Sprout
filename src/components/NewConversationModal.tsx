'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { Search, X, Loader2, MessageSquare } from 'lucide-react'

export default function NewConversationModal({
  currentUserId,
  onClose,
  onCreated,
}: {
  currentUserId: string
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const latestQueryRef = useRef('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const currentQuery = query
    const timer = setTimeout(async () => {
      if (currentQuery.length < 2) { setSearching(false); setResults([]); return }

      setSearching(true)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUserId)
          .or(`username.ilike.%${currentQuery}%,full_name.ilike.%${currentQuery}%`)
          .limit(10)
        if (latestQueryRef.current !== currentQuery) return
        if (data) setResults(data)
      } catch {
        if (latestQueryRef.current !== currentQuery) return
        setResults([])
      } finally {
        if (latestQueryRef.current === currentQuery) setSearching(false)
      }
    }, 300)

    latestQueryRef.current = currentQuery
    return () => clearTimeout(timer)
  }, [query, supabase, currentUserId])

  const startConversation = async (otherUser: Profile) => {
    if (creating) return
    setCreating(true)

    const userA = currentUserId < otherUser.id ? currentUserId : otherUser.id
    const userB = currentUserId < otherUser.id ? otherUser.id : currentUserId

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle()

    if (existing) {
      setCreating(false)
      onCreated(existing.id)
      return
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ user_a: userA, user_b: userB })
      .select()
      .single()

    if (error || !conv) { setCreating(false); return }

    setCreating(false)
    onCreated(conv.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-primary">New message</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-alt transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="flex items-center gap-2 bg-surface-alt rounded-xl px-3 py-2.5 border border-border focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all duration-200">
            <Search className="w-4 h-4 text-secondary shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pb-2">
          {searching ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-muted animate-spin" />
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="text-center py-10">
              <p className="text-sm text-secondary">No users found</p>
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => startConversation(user)}
                disabled={creating}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-accent-soft transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                  {getInitials(user.full_name || user.username)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-secondary truncate">
                    @{user.username}
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-secondary ml-auto shrink-0" />
              </button>
            ))
          )}
          {query.length < 2 && (
            <div className="text-center py-10">
              <p className="text-xs text-secondary">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
