import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectDetail from './ProjectDetail'
import type { AppData } from './ProjectDetail'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      owner:owner_id (id, username, full_name, avatar_url, bio),
      skills_needed:project_skills_needed (
        skill_id,
        slots_open,
        skill:skill_id (id, name, category)
      ),
      members:project_members (
        user_id,
        role,
        skill_id,
        joined_at,
        profile:user_id (id, username, full_name, avatar_url),
        skill:skill_id (id, name)
      ),
      updates:project_updates (
        id,
        content,
        created_at,
        author:author_id (id, username, full_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const isOwner = user?.id === project.owner_id

  // Get applications for this project (if owner)
  let applications: AppData[] = []
  if (isOwner) {
    const { data } = await supabase
      .from('applications')
      .select('id, applicant_id, skill_id, status')
      .eq('project_id', id)
    applications = (data || []) as AppData[]
  }

  // Check if current user has applied
  let userApplication = null
  if (user && !isOwner) {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('project_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()
    userApplication = data
  }

  const isMember = project.members?.some((m: { user_id: string }) => m.user_id === user?.id)

  return (
    <ProjectDetail
      project={project}
      currentUser={user}
      isOwner={isOwner}
      isMember={!!isMember}
      userApplication={userApplication}
      applications={applications}
    />
  )
}
