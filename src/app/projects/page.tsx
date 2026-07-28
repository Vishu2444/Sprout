import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProjectCard from '@/components/ProjectCard'
import FilterBar from '@/components/FilterBar'
import { Sprout, ArrowRight } from 'lucide-react'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; status?: string; sort?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:owner_id (id, username, full_name, avatar_url),
      skills_needed:project_skills_needed (
        skill_id,
        slots_open,
        skill:skill_id (id, name, category)
      )
    `)

  if (params.skill) {
    const { data: matchingSkills } = await supabase
      .from('skills')
      .select('id')
      .ilike('name', `%${params.skill}%`)
    if (matchingSkills && matchingSkills.length > 0) {
      const { data: matchingPS } = await supabase
        .from('project_skills_needed')
        .select('project_id')
        .in('skill_id', matchingSkills.map(s => s.id))
      if (matchingPS && matchingPS.length > 0) {
        const projectIds = [...new Set(matchingPS.map(ps => ps.project_id))]
        query = query.in('id', projectIds)
      } else {
        query = query.in('id', [])
      }
    } else {
      query = query.in('id', [])
    }
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }

  const sortField = params.sort === 'oldest' ? 'created_at' : 'created_at'
  const sortOrder = params.sort === 'oldest' ? { ascending: true } as const : { ascending: false } as const
  query = query.order(sortField, sortOrder)

  const { data: projects } = await query

  const { data: skills } = await supabase.from('skills').select('*').order('name')

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sprout-500 to-sprout-700 flex items-center justify-center">
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-heading">Discover Projects</h1>
        </div>
        <p className="text-body-secondary">Browse ideas looking for collaborators</p>
      </div>

      <FilterBar skills={skills || []} currentParams={params} />

      {(!projects || projects.length === 0) ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-6 h-6 text-secondary" />
          </div>
          <p className="text-card-title mb-1">No projects found</p>
          <p className="text-body-secondary mb-6">Try adjusting your filters or post the first seed</p>
          {user ? (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-xl px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Post an idea
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-xl px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Sign up to post
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
