import Link from 'next/link'
import { getStatusColor, timeAgo } from '@/lib/utils'
import { Users, Clock } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    title: string
    tagline: string | null
    status: string
    created_at: string
    owner: {
      username: string
      full_name: string | null
      avatar_url: string | null
    } | null
    skills_needed: {
      skill: { id: string; name: string; category: string | null } | null
      slots_open: number
    }[]
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const filledSkills = project.skills_needed?.filter((s) => s.skill) || []
  const totalSlots = filledSkills.reduce((sum, s) => sum + s.slots_open, 0)

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block bg-surface border border-border rounded-[--radius-lg] p-4 card-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
        <span className="text-xs text-muted flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {timeAgo(project.created_at)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-primary mb-1 line-clamp-1 group-hover:text-accent transition-colors duration-200">
        {project.title}
      </h3>
      {project.tagline && (
        <p className="text-sm text-secondary mb-4 line-clamp-2">{project.tagline}</p>
      )}

      {filledSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {filledSkills.map((s) => (
            <span
              key={s.skill!.id}
              className="px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-medium border border-accent/30"
            >
              {s.skill!.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Users className="w-4 h-4" />
          <span>{totalSlots} slot{totalSlots !== 1 ? 's' : ''} open</span>
        </div>
        <span className="text-xs text-muted">
          by {project.owner?.full_name || project.owner?.username || 'unknown'}
        </span>
      </div>
    </Link>
  )
}
