'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { getInitials, timeAgo } from '@/lib/utils'
import { useConversations } from '@/hooks/use-conversations'
import { MessageSquare, Plus, ChevronRight, Loader2 } from 'lucide-react'
import NewConversationModal from '@/components/NewConversationModal'

export default function MessagesClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const router = useRouter()
  const { conversations, loading } = useConversations(profile.id)
  const [showNewModal, setShowNewModal] = useState(false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-heading">Messages</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New message
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-border">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-card-title mb-1">No messages yet</h3>
          <p className="text-sm text-secondary mb-6">Start a conversation with someone</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-accent-on rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Send a message
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border hover:border-accent transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                {getInitials(conv.otherProfile?.full_name || conv.otherProfile?.username)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-primary truncate">
                    {conv.otherProfile?.full_name || conv.otherProfile?.username || 'Unknown'}
                  </span>
                </div>
                <p className="text-xs text-secondary truncate mt-0.5">
                  End-to-end encrypted
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewConversationModal
          currentUserId={profile.id}
          onClose={() => setShowNewModal(false)}
          onCreated={(convId) => {
            setShowNewModal(false)
            router.push(`/messages/${convId}`)
          }}
        />
      )}
    </div>
  )
}
