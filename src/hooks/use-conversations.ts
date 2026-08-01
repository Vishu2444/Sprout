'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Conversation } from '@/lib/types'

interface EnrichedConversation extends Conversation {
  otherProfile: Profile
}

async function loadConversations(userId: string): Promise<EnrichedConversation[] | null> {
  const supabase = createClient()

  const { data: convos } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (!convos) return null

  const enriched: EnrichedConversation[] = await Promise.all(
    convos.map(async (conv) => {
      const otherId = conv.user_a === userId ? conv.user_b : conv.user_a
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId)
        .single()
      return { ...conv, otherProfile: otherProfile! } as EnrichedConversation
    }),
  )

  return enriched
}

export function useConversations(userId: string) {
  const supabase = createClient()
  const [conversations, setConversations] = useState<EnrichedConversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    loadConversations(userId).then((enriched) => {
      if (cancelled) return
      if (!enriched) { setLoading(false); return }
      setConversations(enriched)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [userId])

  const createConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    const userA = userId < otherUserId ? userId : otherUserId
    const userB = userId < otherUserId ? otherUserId : userId

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle()

    if (existing) return existing.id

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ user_a: userA, user_b: userB })
      .select()
      .single()

    if (error || !conv) return null

    const enriched = await loadConversations(userId)
    if (enriched) setConversations(enriched)

    return conv.id
  }, [userId, supabase])

  return { conversations, loading, createConversation }
}
