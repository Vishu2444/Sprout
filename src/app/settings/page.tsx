'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Skill } from '@/lib/types'
import { Save, Check } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) {
        setProfile(prof); setUsername(prof.username); setFullName(prof.full_name || '')
        setBio(prof.bio || ''); setLocation(prof.location || '')
      }
      const { data: skills } = await supabase.from('skills').select('*').order('name')
      if (skills) setAllSkills(skills)
      const { data: us } = await supabase.from('user_skills').select('skill_id').eq('user_id', user.id)
      if (us) setUserSkills(us.map((s) => s.skill_id))
    }
    load()
  }, [supabase, router])

  const toggleSkill = (skillId: string) => {
    setUserSkills((prev) => prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId])
  }

  const handleSave = async () => {
    setLoading(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: profileError } = await supabase.from('profiles').update({ username, full_name: fullName, bio, location }).eq('id', user.id)
    if (profileError) { setError(profileError.message); setLoading(false); return }
    await supabase.from('user_skills').delete().eq('user_id', user.id)
    if (userSkills.length > 0) {
      await supabase.from('user_skills').insert(userSkills.map((skillId) => ({ user_id: user.id, skill_id: skillId, proficiency: 'intermediate' })))
    }
    setLoading(false); setSaved(true); router.refresh()
  }

  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-6">
        <h1 className="text-heading">Settings</h1>
        <p className="text-sm text-secondary mt-1">Edit your profile and skills</p>
      </div>

      <div className="space-y-4">
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Profile</h2>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Username</label>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Full name</label>
            <input
              type="text" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Bio</label>
            <textarea
              rows={3} value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">Location</label>
            <input
              type="text" value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 bg-surface"
              placeholder="City, Country"
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-primary mb-3">Your Skills</h2>
          <div className="flex flex-wrap gap-1">
            {allSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  userSkills.includes(skill.id)
                    ? 'bg-accent text-accent-on shadow-xs'
                    : 'bg-surface border border-border text-secondary hover:border-accent hover:text-accent'
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
        {saved && (
          <p className="text-sm text-structure bg-structure-50 dark:bg-structure-900/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-accent text-accent-on rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
