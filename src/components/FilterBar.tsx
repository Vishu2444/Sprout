'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Filter, ArrowUpDown } from 'lucide-react'

interface Skill {
  id: string
  name: string
  category: string | null
}

interface FilterBarProps {
  skills: Skill[]
  currentParams: { skill?: string; status?: string; sort?: string }
}

export default function FilterBar({ skills, currentParams }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams()
    if (currentParams.skill && key !== 'skill') params.set('skill', currentParams.skill)
    if (currentParams.status && key !== 'status') params.set('status', currentParams.status)
    if (currentParams.sort && key !== 'sort') params.set('sort', currentParams.sort)
    if (value) params.set(key, value)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const categories = [...new Set(skills.map((s) => s.category).filter(Boolean))] as string[]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-secondary" />
          <select
            value={currentParams.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || undefined)}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          >
            <option value="">All statuses</option>
            <option value="seed">Seed</option>
            <option value="growing">Growing</option>
            <option value="launched">Launched</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-secondary" />
          <select
            value={currentParams.sort || 'newest'}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => updateFilter('skill', undefined)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            !currentParams.skill
              ? 'bg-accent text-accent-on shadow-xs'
              : 'bg-surface border border-border text-secondary hover:border-accent hover:text-accent'
          }`}
        >
          All
        </button>
        {skills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => updateFilter('skill', currentParams.skill === skill.name ? undefined : skill.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              currentParams.skill === skill.name
                ? 'bg-accent text-accent-on shadow-xs'
                : 'bg-surface border border-border text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            {skill.name}
          </button>
        ))}
      </div>
    </div>
  )
}
