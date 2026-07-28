'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Skill } from '@/lib/types'
import { getStatusColor, timeAgo, getInitials } from '@/lib/utils'
import { Sprout, Users, MessageSquare, Send, ArrowLeft, ExternalLink, Clock, Check, X } from 'lucide-react'

interface ProjectData {
  id: string
  owner_id: string
  title: string
  tagline: string | null
  description: string
  status: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
  owner: Profile | null
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
  updates: {
    id: string
    content: string
    created_at: string
    author: Profile | null
  }[]
}

export interface AppData {
  id: string
  applicant_id: string
  skill_id: string
  status: string
}

interface Props {
  project: ProjectData
  currentUser: { id: string } | null
  isOwner: boolean
  isMember: boolean
  userApplication: { id: string; status: string; skill_id: string } | null
  applications: AppData[]
  allSkills: Skill[]
}

export default function ProjectDetail({ project, currentUser, isOwner, isMember, userApplication, applications, allSkills }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [applySkill, setApplySkill] = useState('')
  const [applyMessage, setApplyMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [updateContent, setUpdateContent] = useState('')
  const [postingUpdate, setPostingUpdate] = useState(false)
  const [error, setError] = useState('')
  const [showApply, setShowApply] = useState(false)

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentUser) { router.push('/login'); return }
    if (!applySkill) return
    setApplying(true)
    const { error: appError } = await supabase.from('applications').insert({
      project_id: project.id, applicant_id: currentUser.id, skill_id: applySkill, message: applyMessage,
    })
    if (appError) { setError(appError.message); setApplying(false); return }
    await supabase.from('notifications').insert({
      user_id: project.owner_id, type: 'new_application',
      payload: { project_id: project.id, project_title: project.title, applicant_id: currentUser.id },
    })
    setShowApply(false); setApplySkill(''); setApplyMessage(''); setApplying(false); router.refresh()
  }

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateContent.trim() || !currentUser) return
    setPostingUpdate(true)
    const { error } = await supabase.from('project_updates').insert({
      project_id: project.id, author_id: currentUser.id, content: updateContent,
    })
    if (error) { setError(error.message); setPostingUpdate(false); return }
    const otherMembers = project.members?.filter((m) => m.user_id !== currentUser.id) || []
    for (const member of otherMembers) {
      await supabase.from('notifications').insert({
        user_id: member.user_id, type: 'new_update',
        payload: { project_id: project.id, project_title: project.title },
      })
    }
    setUpdateContent(''); setPostingUpdate(false); router.refresh()
  }

  const filledSkills = project.skills_needed?.filter((s) => s.skill) || []
  const appliedSkillIds = new Set(
    applications.filter((a) => a.status === 'accepted' || a.status === 'pending').map((a) => a.skill_id)
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-accent mb-6 transition-colors duration-200 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to projects
      </Link>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project header */}
          <div className="bg-surface rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              <span className="text-xs text-secondary flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {timeAgo(project.created_at)}
              </span>
            </div>
            <h1 className="text-heading mb-1">{project.title}</h1>
            {project.tagline && <p className="text-sm text-secondary">{project.tagline}</p>}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {getInitials(project.owner?.full_name || project.owner?.username)}
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-primary">
                  {project.owner?.full_name || project.owner?.username || 'Unknown'}
                </span>
                <p className="text-xs text-secondary">Project owner</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-surface rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-3">About</h2>
            <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
              {project.description}
            </div>
          </div>

          {/* Updates feed */}
          <div className="bg-surface rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" />
              Updates
            </h2>

            {isMember && (
              <form onSubmit={handlePostUpdate} className="mb-6">
                <textarea
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-none"
                  placeholder="Share a progress update..."
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!updateContent.trim() || postingUpdate}
                    className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-xl px-4 py-2 text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    {postingUpdate ? 'Posting...' : 'Post update'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {(!project.updates || project.updates.length === 0) && (
                <div className="text-center py-10">
                  <MessageSquare className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="text-sm text-secondary">No updates yet</p>
                </div>
              )}
              {project.updates?.map((update) => (
                <div key={update.id} className="bg-surface-alt rounded-xl border border-border p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sprout-400 to-sprout-600 flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-white">
                          {getInitials(update.author?.full_name || update.author?.username)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {update.author?.full_name || update.author?.username}
                      </span>
                    </div>
                    <span className="text-xs text-muted">{timeAgo(update.created_at)}</span>
                  </div>
                  <p className="text-sm text-secondary whitespace-pre-wrap">{update.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Skills needed / Apply */}
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Looking for
            </h3>
            {filledSkills.length === 0 ? (
              <p className="text-sm text-secondary">No skills listed yet</p>
            ) : (
              <div className="space-y-2">
                {filledSkills.map((s) => {
                  const accepted = applications.filter(
                    (a) => a.skill_id === s.skill_id && a.status === 'accepted'
                  ).length
                  const remaining = s.slots_open - accepted
                  return (
                    <div key={s.skill_id} className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">{s.skill!.name}</span>
                      <span className="text-xs text-secondary">{accepted}/{s.slots_open} filled</span>
                    </div>
                  )
                })}
              </div>
            )}

            {!isOwner && !isMember && currentUser && !userApplication && (
              <button
                onClick={() => setShowApply(true)}
                className="mt-4 w-full bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Apply to join
              </button>
            )}
            {userApplication && (
              <div className="mt-3 text-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  userApplication.status === 'pending'
                    ? 'bg-accent-soft text-accent'
                    : userApplication.status === 'accepted'
                    ? 'status-growing'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {userApplication.status === 'pending' ? 'Application pending'
                    : userApplication.status === 'accepted' ? 'Accepted!'
                    : 'Rejected'}
                </span>
              </div>
            )}
            {isOwner && (
              <Link
                href={`/projects/${project.id}/manage`}
                className="mt-3 w-full flex items-center justify-center gap-2 border border-border text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt active:scale-[0.98] transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                Manage project
              </Link>
            )}
          </div>

          {/* Team roster */}
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-primary mb-3">Team</h3>
            {(!project.members || project.members.length === 0) ? (
              <div className="text-center py-6">
                <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
                <p className="text-sm text-secondary">No team members yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {project.members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sprout-400 to-sprout-600 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {getInitials(member.profile?.full_name || member.profile?.username)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        {member.profile?.full_name || member.profile?.username}
                      </p>
                      <div className="flex items-center gap-2">
                        {member.skill && (
                          <span className="text-xs text-accent font-medium">{member.skill.name}</span>
                        )}
                        <span className="text-xs text-secondary">{member.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-in">
            <h3 className="text-lg font-semibold text-primary mb-1">Apply to join</h3>
            <p className="text-sm text-secondary mb-5">{project.title}</p>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Which skill are you applying with?</label>
                <select
                  value={applySkill}
                  onChange={(e) => setApplySkill(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
                  required
                >
                  <option value="">Select a skill</option>
                  {filledSkills.map((s) => (
                    <option key={s.skill_id} value={s.skill_id}>{s.skill!.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Pitch message</label>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-none"
                  placeholder="Tell the owner why you'd be a great fit..."
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30 px-3 py-2 rounded-[--radius-sm]">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 border border-border text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt active:scale-[0.98] transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!applySkill || applying}
                  className="flex-1 bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {applying ? 'Submitting...' : 'Submit application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
