'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Profile } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { useConversations } from '@/hooks/use-conversations'
import { hasKeyBackup } from '@/lib/crypto/identity'
import { loadPrivateKey } from '@/lib/crypto/key-storage'
import { MessageSquare, Plus, ChevronRight, Loader2, X } from 'lucide-react'
import NewConversationModal from '@/components/NewConversationModal'
import KeyBackupModal from '@/components/KeyBackupModal'

export default function MessagesClient({ profile }: { profile: Profile }) {
  const router = useRouter()
  const { conversations, loading } = useConversations(profile.id)
  const [showNewModal, setShowNewModal] = useState(false)
  const [backupState, setBackupState] = useState<'checking' | 'none' | 'restore_needed' | 'ok'>('checking')
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [backupModalMode, setBackupModalMode] = useState<'create' | 'restore'>('create')
  const [backupBannerHidden, setBackupBannerHidden] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const [hasBackup, hasLocal] = await Promise.all([
          hasKeyBackup(profile.id),
          loadPrivateKey(profile.id),
        ])
        if (cancelled) return
        if (hasLocal && !hasBackup) setBackupState('none')
        else if (!hasLocal && hasBackup) setBackupState('restore_needed')
        else setBackupState('ok')
      } catch {
        if (!cancelled) setBackupState('ok')
      }
    }

    check()
    return () => { cancelled = true }
  }, [profile.id])

  const refreshBackupState = async () => {
    const [hasBackup, hasLocal] = await Promise.all([
      hasKeyBackup(profile.id),
      loadPrivateKey(profile.id),
    ])
    if (hasLocal && hasBackup) setBackupState('ok')
    else if (!hasLocal && hasBackup) setBackupState('restore_needed')
    else if (hasLocal && !hasBackup) setBackupState('none')
  }

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

      {!backupBannerHidden && backupState === 'none' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
          <span className="flex-1">
            Your encryption key isn&apos;t backed up. Set a passphrase to recover your messages on a new device.
          </span>
          <button
            onClick={() => { setBackupModalMode('create'); setShowBackupModal(true) }}
            className="shrink-0 font-semibold underline"
          >
            Set up
          </button>
          <button
            onClick={() => setBackupBannerHidden(true)}
            className="shrink-0 text-amber-500 hover:text-amber-700 font-bold"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {!backupBannerHidden && backupState === 'restore_needed' && (
        <div className="mb-4 p-3 rounded-xl bg-accent-soft border border-accent/30 text-sm text-primary flex items-center gap-2">
          <span className="flex-1">
            You&apos;re on a new device. Restore your encryption key to read past messages.
          </span>
          <button
            onClick={() => { setBackupModalMode('restore'); setShowBackupModal(true) }}
            className="shrink-0 font-semibold text-accent underline"
          >
            Restore key
          </button>
          <button
            onClick={() => setBackupBannerHidden(true)}
            className="shrink-0 text-secondary hover:text-primary font-bold"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {showBackupModal && (
        <KeyBackupModal
          userId={profile.id}
          mode={backupModalMode}
          onClose={() => setShowBackupModal(false)}
          onSuccess={() => {
            setShowBackupModal(false)
            refreshBackupState()
          }}
        />
      )}
    </div>
  )
}
