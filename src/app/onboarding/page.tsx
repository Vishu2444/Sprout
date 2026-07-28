'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Skill } from '@/lib/types'
import { Sprout, ArrowRight, Check } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customSkill, setCustomSkill] = useState('')

  useEffect(() => {
    supabase.from('skills').select('*').order('name').then(({ data, error }) => {
      if (error) { setError('Could not load skills: ' + error.message); return }
      if (data) setAllSkills(data)
    })
  }, [supabase])

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId])
  }

  const handleAddCustomSkill = async () => {
    if (!customSkill.trim()) return
    const { data, error } = await supabase.from('skills').insert({ name: customSkill.trim(), category: 'Other' }).select().single()
    if (error) { setError('Could not add skill: ' + error.message); return }
    if (data) {
      setAllSkills((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSkills((prev) => [...prev, data.id])
      setCustomSkill('')
    }
  }

  const handleFinish = async () => {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }
    const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', username).neq('id', user.id).maybeSingle()
    if (existingUser) { setError('Username is already taken. Please choose another.'); setLoading(false); return }
    const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, username, full_name: fullName, bio })
    if (profileError) { setError(profileError.message); setLoading(false); return }
    if (selectedSkills.length > 0) {
      const { error: skillsError } = await supabase.from('user_skills').insert(
        selectedSkills.map((skillId) => ({ user_id: user.id, skill_id: skillId, proficiency: 'intermediate' }))
      )
      if (skillsError) { setError(skillsError.message); setLoading(false); return }
    }
    router.push('/projects'); router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sprout-500 to-sprout-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-heading">Welcome to Sprout</h1>
          <p className="text-sm text-secondary mt-1">Let&apos;s set up your profile</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[0, 1].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  s === step
                    ? 'bg-accent text-accent-on shadow-xs'
                    : s < step
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface-alt text-secondary'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s + 1}
              </div>
              {s === 0 && <div className={`w-8 h-0.5 rounded-full ${step > 0 ? 'bg-accent' : 'bg-border'} transition-colors duration-200`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-primary mb-1.5">Username</label>
              <input
                id="username" type="text" value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
                placeholder="your_username" required
              />
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-primary mb-1.5">Full name</label>
              <input
                id="fullName" type="text" value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-primary mb-1.5">Bio</label>
              <textarea
                id="bio" rows={3} value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-none"
                placeholder="Tell us a bit about yourself..."
              />
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={!username.trim()}
              className="w-full bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="bg-surface rounded-2xl border border-border p-6">
            <p className="text-sm text-secondary mb-4">
              Pick the skills you bring to the table. These help others find you for projects.
            </p>
            <div className="flex flex-wrap gap-1 mb-4">
              {allSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    selectedSkills.includes(skill.id)
                      ? 'bg-accent text-accent-on shadow-xs'
                      : 'bg-surface border border-border text-secondary hover:border-accent hover:text-accent'
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text" value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface flex-1"
                placeholder="Add a skill..."
              />
              <button
                onClick={handleAddCustomSkill}
                className="border border-border text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt active:scale-[0.98] transition-all duration-200"
              >
                Add
              </button>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 border border-border text-primary rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-surface-alt active:scale-[0.98] transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? 'Saving...' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
