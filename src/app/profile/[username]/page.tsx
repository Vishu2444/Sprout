import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInitials, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { Sprout, MapPin, Calendar, Award, ExternalLink } from 'lucide-react'
import MessageButton from '@/components/MessageButton'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  if (!profile) notFound()

  const { data: rawUserSkills } = await supabase
    .from('user_skills')
    .select('skill_id, proficiency')
    .eq('user_id', profile.id)

  const skillIds = (rawUserSkills || []).map((s: { skill_id: string }) => s.skill_id)
  const { data: skillData } = await supabase
    .from('skills')
    .select('*')
    .in('id', skillIds.length > 0 ? skillIds : ['none'])

  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id, title, tagline, status, created_at')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id, skill_id')
    .eq('user_id', profile.id)
    .neq('role', 'owner')

  const contribProjectIds = (memberRows || []).map((r: { project_id: string }) => r.project_id)
  const { data: contribProjects } = await supabase
    .from('projects')
    .select('id, title, tagline, status, owner_id')
    .in('id', contribProjectIds.length > 0 ? contribProjectIds : ['none'])

  const contribOwnerIds = [...new Set((contribProjects || []).map((p: { owner_id: string }) => p.owner_id))]
  const { data: contribOwners } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', contribOwnerIds.length > 0 ? contribOwnerIds : ['none'])

  const { data: memberSkills } = await supabase
    .from('skills')
    .select('*')
    .in('id', (memberRows || []).map((r: { skill_id: string }) => r.skill_id).filter(Boolean))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sprout-400 to-sprout-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-2xl font-bold text-white">
              {getInitials(profile.full_name || profile.username)}
            </span>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-heading">{profile.full_name || profile.username}</h1>
            <p className="text-sm text-secondary">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-secondary mt-2 max-w-lg">{profile.bio}</p>}
            {user && user.id !== profile.id && (
              <div className="mt-4"><MessageButton otherUserId={profile.id} /></div>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
              {profile.location && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt text-secondary text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt text-secondary text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Skills */}
        {skillData && skillData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-1">
              {skillData.map((skill: { id: string; name: string; category: string | null }) => (
                <span key={skill.id} className="px-2 py-0.5 rounded-full bg-surface-alt border border-border text-xs font-semibold text-primary">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Owned projects */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-accent" />
            Projects ({ownedProjects?.length || 0})
          </h2>
          {(!ownedProjects || ownedProjects.length === 0) ? (
            <div className="text-center py-10 bg-surface rounded-2xl border border-border">
              <Sprout className="w-6 h-6 text-secondary mx-auto mb-2" />
              <p className="text-sm text-secondary">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ownedProjects.map((proj: { id: string; title: string; tagline: string | null; status: string }) => (
                <Link key={proj.id} href={`/projects/${proj.id}`} className="block bg-surface rounded-2xl border border-border p-4 hover:shadow-md hover:border-accent transition-all duration-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(proj.status)}`}>
                      {proj.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">{proj.title}</h3>
                  {proj.tagline && <p className="text-xs text-secondary mt-0.5">{proj.tagline}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contributed projects */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-accent" />
            Contributed
          </h2>
          {(!contribProjects || contribProjects.length === 0) ? (
            <div className="text-center py-10 bg-surface rounded-2xl border border-border">
              <ExternalLink className="w-6 h-6 text-secondary mx-auto mb-2" />
              <p className="text-sm text-secondary">No contributions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(contribProjects || []).map((proj: { id: string; title: string; tagline: string | null; status: string; owner_id: string }) => {
                const memberRow = memberRows?.find((r: { project_id: string; skill_id: string }) => r.project_id === proj.id)
                const skill = memberSkills?.find((s: { id: string }) => s.id === memberRow?.skill_id)
                const owner = (contribOwners || []).find((o: { id: string }) => o.id === proj.owner_id)
                return (
                  <Link key={proj.id} href={`/projects/${proj.id}`} className="block bg-surface rounded-2xl border border-border p-4 hover:shadow-md hover:border-accent transition-all duration-200">
                    <div className="flex items-center gap-2 mb-1">
                      {skill && <span className="text-xs font-medium text-accent bg-accent-soft px-2 py-0.5 rounded-full">{skill.name}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-primary">{proj.title}</h3>
                    {proj.tagline && <p className="text-xs text-secondary mt-0.5">{proj.tagline}</p>}
                    <p className="text-xs text-muted mt-1">by {owner?.full_name || owner?.username || 'unknown'}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
