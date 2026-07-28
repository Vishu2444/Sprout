import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManageProject from './ManageProject'

export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      owner:owner_id (id, username, full_name, avatar_url),
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
      )
    `)
    .eq('id', id)
    .single()

  if (!project) notFound()
  if (project.owner_id !== user.id) redirect(`/projects/${id}`)

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      applicant:applicant_id (id, username, full_name, avatar_url, bio),
      skill:skill_id (id, name)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: allSkills } = await supabase.from('skills').select('*').order('name')

  return (
    <ManageProject
      project={project}
      applications={applications || []}
      allSkills={allSkills || []}
      currentUserId={user.id}
    />
  )
}
