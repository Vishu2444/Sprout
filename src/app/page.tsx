import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectCard from '@/components/ProjectCard'
import { Sprout, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/projects')
  }

  const { data: projects } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <div>
      {/* ── Hero ── */}
      <section className="pt-20 pb-14 lg:pt-28 lg:pb-18 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sprout-500 to-sprout-700 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-hero text-balance leading-[1.1]">
              Post an idea, get discovered,{' '}
              <span className="text-accent">build together.</span>
            </h1>
            <p className="mt-4 text-body-secondary text-balance max-w-md mx-auto">
              Share a project, describe the skills you need, and let the right people
              find you — no cold DMs, just builders.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-[--radius-sm] px-6 py-3 text-body-strong hover:bg-accent-hover active:scale-[0.97] transition-all duration-[--transition-fast] shadow-sm hover:shadow-md"
              >
                Post your idea
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 bg-surface text-primary rounded-[--radius-sm] px-6 py-3 text-body-strong border border-border hover:bg-surface-alt active:scale-[0.97] transition-all duration-[--transition-fast]"
              >
                Browse projects
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Project preview ── */}
      <section className="pb-20 lg:pb-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-section">Recent seeds</h2>
              <p className="text-body-secondary mt-1">Fresh ideas looking for collaborators</p>
            </div>
            <Link
              href="/projects"
              className="text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Browse all &rarr;
            </Link>
          </div>

          {(!projects || projects.length === 0) ? (
            <div className="text-center py-16 bg-surface/80 backdrop-blur-sm rounded-[--radius-lg] border border-border">
              <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center mx-auto mb-3">
                <Sprout className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-card-title mb-1">No seeds yet</p>
              <p className="text-body-secondary mb-5">Be the first to post an idea</p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-accent text-accent-on rounded-[--radius-sm] px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-sm active:scale-[0.98]"
              >
                Post your idea
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
