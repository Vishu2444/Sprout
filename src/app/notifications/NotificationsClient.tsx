'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import { Bell, CheckCheck, UserPlus, MessageSquare, XCircle, CheckCircle } from 'lucide-react'

interface Notification {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export default function NotificationsClient({ notifications, userId }: { notifications: Notification[]; userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    router.refresh()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_application': return <UserPlus className="w-4 h-4 text-accent" />
      case 'application_accepted': return <CheckCircle className="w-4 h-4 text-structure" />
      case 'application_rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'new_update': return <MessageSquare className="w-4 h-4 text-accent" />
      default: return <Bell className="w-4 h-4 text-secondary" />
    }
  }

  const getTitle = (n: Notification) => {
    const title = n.payload?.project_title as string || 'Unknown project'
    switch (n.type) {
      case 'new_application': return `New application for "${title}"`
      case 'application_accepted': return `Your application to "${title}" was accepted!`
      case 'application_rejected': return `Your application to "${title}" was rejected`
      case 'new_update': return `New update in "${title}"`
      default: return 'Notification'
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading">Notifications</h1>
          <p className="text-sm text-secondary mt-1">Stay up to date with your projects</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1 bg-surface-alt text-secondary rounded-xl px-3 py-1.5 text-xs font-semibold hover:text-primary hover:bg-border transition-all duration-200"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-secondary" />
          </div>
          <p className="text-card-title mb-1">No notifications yet</p>
          <p className="text-sm text-secondary">You&apos;ll see updates here when something happens</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-200 ${
                n.read
                  ? 'bg-surface border border-border'
                  : 'bg-accent-soft border border-accent/30 shadow-xs'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-surface shadow-xs flex items-center justify-center mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'text-secondary' : 'text-primary font-medium'}`}>
                  {getTitle(n)}
                </p>
                <p className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
