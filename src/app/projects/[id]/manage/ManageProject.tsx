'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Skill } from '@/lib/types'
import { getStatusColor, timeAgo, getInitials } from '@/lib/utils'
import { ArrowLeft, Check, X, UserMinus, Save, Edit3 } from 'lucide-react'

interface ManageProps {
  project: {
    id: string
    title: string
    tagline: string | null
    description: string
    status: string
    cover_image_url: string | null
    skills_needed: {
      skill_id: string
      slots_open: number
      skill: { id: string; name: string; category: string | null } | null
    }[]
    members: {
      user_id: string
      role: string
      skill_id: string
      joined_at: string
      profile: Profile | null
      skill: { id: string; name: string } | null
    }[]
  }
  applications: {
    id: string
    applicant_id: string
    skill_id: string
    message: string | null
    status: string
    created_at: string
    applicant: Profile | null
    skill: { id: string; name: string } | null
  }[]
  allSkills: Skill[]
  currentUserId: string
}

export default function ManageProject({ project, applications, allSkills, currentUserId }: ManageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(project.title)
  const [editTagline, setEditTagline] = useState(project.tagline || '')
  const [editDescription, setEditDescription] = useState(project.description)
  const [editStatus, setEditStatus] = useState(project.status)

  const handleApplicationAction = async (applicationId: string, applicantId: string, skillId: string, action: 'accepted' | 'rejected') => {
    setActionLoading(applicationId)
    setError('')

    const { error: appError } = await supabase
      .from('applications')
      .update({ status: action })
      .eq('id', applicationId)

    if (appError) {
      setError(appError.message)
      setActionLoading(null)
      return
    }

    if (action === 'accepted') {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: applicantId,
          skill_id: skillId,
          role: 'contributor',
        })

      if (memberError) {
        setError(memberError.message)
        setActionLoading(null)
        return
      }

      if (project.status === 'seed') {
        await supabase
          .from('projects')
          .update({ status: 'growing' })
          .eq('id', project.id)
      }
    }

    await supabase.from('notifications').insert({
      user_id: applicantId,
      type: `application_${action}`,
      payload: { project_id: project.id, project_title: project.title },
    })

    setActionLoading(null)
    router.refresh()
  }

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) return
    setActionLoading(`remove-${userId}`)
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', userId)
    setActionLoading(null)
    router.refresh()
  }

  const handleSaveProject = async () => {
    setError('')
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: editTitle,
        tagline: editTagline || null,
        description: editDescription,
        status: editStatus,
      })
      .eq('id', project.id)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  const groupApplicationsBySkill = () => {
    const groups: Record<string, typeof applications> = {}
    for (const app of applications) {
      const skillId = app.skill_id
      if (!groups[skillId]) groups[skillId] = []
      groups[skillId].push(app)
    }
    return groups
  }

  const grouped = groupApplicationsBySkill()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-accent mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to project
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-heading">Manage Project</h1>
          <p className="text-sm text-secondary mt-1">{project.title}</p>
        </div>
        <button
          onClick={() => editing ? handleSaveProject() : setEditing(true)}
          className="bg-accent text-accent-on rounded-xl px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2"
        >
          {editing ? <><Save className="w-4 h-4" /> Save changes</> : <><Edit3 className="w-4 h-4" /> Edit project</>}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30 px-3 py-2 rounded-[--radius-sm] mb-4">{error}</p>}

      {/* Edit form */}
      {editing && (
        <div className="bg-surface rounded-2xl border border-border p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Title</label>
            <input
              type="text" value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Tagline</label>
            <input
              type="text" value={editTagline}
              onChange={(e) => setEditTagline(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Description</label>
            <textarea
              rows={5} value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
            >
              <option value="seed">Seed</option>
              <option value="growing">Growing</option>
              <option value="launched">Launched</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            onClick={() => setEditing(false)}
            className="text-sm text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Applications */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Applications ({applications.length})
          </h2>
          {applications.length === 0 ? (
            <div className="text-center py-10 bg-surface rounded-2xl border border-border">
              <p className="text-sm text-secondary font-medium">No applications yet</p>
              <p className="text-xs text-muted mt-1">Applications will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([skillId, apps]) => {
                const skillName = apps[0]?.skill?.name || 'Unknown'
                const neededSlot = project.skills_needed?.find((s) => s.skill_id === skillId)
                return (
                  <div key={skillId} className="bg-surface rounded-2xl border border-border p-4">
                    <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-2">
                      {skillName}
                      <span className="text-xs font-normal text-muted">({neededSlot?.slots_open || 1} slot{neededSlot?.slots_open !== 1 ? 's' : ''})</span>
                    </h3>
                    <div className="space-y-3">
                      {apps.map((app) => (
                        <div key={app.id} className={`rounded-xl border p-3 transition-colors ${
                          app.status === 'accepted' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' :
                          app.status === 'rejected' ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' :
                          'border-border bg-surface'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sprout-400 to-sprout-600 flex items-center justify-center shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                  {getInitials(app.applicant?.full_name || app.applicant?.username)}
                                </span>
                              </div>
                              <Link href={`/profile/${app.applicant?.username}`} className="text-sm font-medium text-primary hover:text-accent transition-colors">
                                {app.applicant?.full_name || app.applicant?.username}
                              </Link>
                            </div>
                            <span className="text-xs text-muted">{timeAgo(app.created_at)}</span>
                          </div>
                          {app.message && (
                            <p className="text-sm text-secondary mb-3 whitespace-pre-wrap bg-surface-alt rounded-lg px-3 py-2">{app.message}</p>
                          )}
                          {app.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApplicationAction(app.id, app.applicant_id, app.skill_id, 'accepted')}
                                disabled={actionLoading === app.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                              >
                                <Check className="w-3 h-3" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleApplicationAction(app.id, app.applicant_id, app.skill_id, 'rejected')}
                                disabled={actionLoading === app.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          )}
                          {app.status !== 'pending' && (
                            <span className={`text-xs font-medium inline-flex items-center gap-1 ${
                              app.status === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                            }`}>
                              {app.status === 'accepted' ? <><Check className="w-3 h-3" /> Accepted</> : <><X className="w-3 h-3" /> Rejected</>}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Team ({project.members?.length || 0})
          </h2>
          {(!project.members || project.members.length === 0) ? (
            <div className="text-center py-10 bg-surface rounded-2xl border border-border">
              <p className="text-sm text-secondary font-medium">No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.members.map((member) => (
                <div key={member.user_id} className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sprout-400 to-sprout-600 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {getInitials(member.profile?.full_name || member.profile?.username)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {member.profile?.full_name || member.profile?.username}
                      </p>
                      <div className="flex items-center gap-2">
                        {member.skill && (
                          <span className="text-xs text-accent font-medium">{member.skill.name}</span>
                        )}
                        <span className="text-xs text-muted">{member.role}</span>
                      </div>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={actionLoading === `remove-${member.user_id}`}
                      className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
