'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Loader2 } from 'lucide-react'

export default function MessageButton({ otherUserId }: { otherUserId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const userA = user.id < otherUserId ? user.id : otherUserId
    const userB = user.id < otherUserId ? otherUserId : user.id

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle()

    if (existing) {
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ user_a: userA, user_b: userB })
      .select()
      .single()

    if (error || !conv) { setLoading(false); return }

    router.push(`/messages/${conv.id}`)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageSquare className="w-4 h-4" />
      )}
      Message
    </button>
  )
}
