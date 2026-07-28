'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Skill } from '@/lib/types'
import { Sprout, X, Plus, ArrowRight } from 'lucide-react'

interface SkillSlot {
  skill_id: string
  skill_name: string
  slots_open: number
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skillSlots, setSkillSlots] = useState<SkillSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSkillPicker, setShowSkillPicker] = useState(false)

  useEffect(() => {
    supabase.from('skills').select('*').order('name').then(({ data }) => {
      if (data) setAllSkills(data)
    })
  }, [supabase])

  const addSkillSlot = (skill: Skill) => {
    if (skillSlots.some((s) => s.skill_id === skill.id)) return
    setSkillSlots([...skillSlots, { skill_id: skill.id, skill_name: skill.name, slots_open: 1 }])
    setShowSkillPicker(false)
  }

  const removeSkillSlot = (skillId: string) => {
    setSkillSlots(skillSlots.filter((s) => s.skill_id !== skillId))
  }

  const updateSlots = (skillId: string, count: number) => {
    setSkillSlots(skillSlots.map((s) => (s.skill_id === skillId ? { ...s, slots_open: Math.max(1, count) } : s)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to create a project')
      setLoading(false)
      return
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title,
        tagline,
        description,
        status: 'seed',
      })
      .select()
      .single()

    if (projectError) {
      setError(projectError.message)
      setLoading(false)
      return
    }

    await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
    })

    if (skillSlots.length > 0) {
      const { error: skillsError } = await supabase.from('project_skills_needed').insert(
        skillSlots.map((s) => ({
          project_id: project.id,
          skill_id: s.skill_id,
          slots_open: s.slots_open,
        }))
      )
      if (skillsError) {
        setError(skillsError.message)
        setLoading(false)
        return
      }
    }

    router.push(`/projects/${project.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sprout-500 to-sprout-700 flex items-center justify-center shadow-sm">
          <Sprout className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-heading">Plant a Seed</h1>
      </div>
      <p className="text-sm text-secondary mt-1 ml-11 mb-8">Describe your project idea and the skills you need</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-primary mb-1.5">
              Project title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
              placeholder="Give your project a name"
              required
            />
          </div>

          <div>
            <label htmlFor="tagline" className="block text-sm font-medium text-primary mb-1.5">
              Tagline
            </label>
            <input
              id="tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
              placeholder="A short description (optional)"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-primary mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-y"
              placeholder="What are you building? What stage is it in? What kind of help do you need?"
              required
            />
          </div>

          {/* Skills needed */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Skills needed
            </label>
            {skillSlots.length > 0 && (
              <div className="space-y-2 mb-3">
                {skillSlots.map((slot) => (
                  <div key={slot.skill_id} className="flex items-center gap-3 bg-surface rounded-xl border border-border px-4 py-2.5">
                    <span className="text-sm font-medium text-primary flex-1">{slot.skill_name}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-secondary">Slots:</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={slot.slots_open}
                        onChange={(e) => updateSlots(slot.skill_id, parseInt(e.target.value))}
                        className="w-16 rounded-lg border border-border px-2 py-1 text-sm text-center bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
                      />
                    </div>
                    <button type="button" onClick={() => removeSkillSlot(slot.skill_id)} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showSkillPicker ? (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {allSkills
                    .filter((s) => !skillSlots.some((slot) => slot.skill_id === s.id))
                    .map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => addSkillSlot(skill)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-alt text-primary hover:bg-accent-soft hover:text-accent transition-colors"
                      >
                        {skill.name}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSkillPicker(false)}
                  className="mt-3 text-xs text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSkillPicker(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-secondary hover:border-accent hover:text-accent hover:bg-accent-soft/50 transition-all duration-200 w-full"
              >
                <Plus className="w-4 h-4" />
                Add a skill you need
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim()}
          className="w-full bg-accent text-accent-on rounded-xl px-5 py-3 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? 'Planting...' : 'Plant your seed'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
