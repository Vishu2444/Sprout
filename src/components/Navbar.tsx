'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { getInitials } from '@/lib/utils'
import { ensureIdentityKeyPair } from '@/lib/crypto/identity'
import { Sprout, Bell, Menu, X, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import ThemeToggle from './theme/theme-toggle'

export default function Navbar({ initialProfile }: { initialProfile: Profile | null }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          if (data) setProfile(data)
          ensureIdentityKeyPair(user.id).catch(() => {})
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut(); setProfile(null); setProfileOpen(false)
  }

  const isActive = (path: string) => {
    if (path === '/projects') return pathname === '/projects'
    return pathname === path || pathname.startsWith(path + '/')
  }

  const navLinks = [{ href: '/projects', label: 'Discover' }]
  if (profile) {
    navLinks.push({ href: '/projects/new', label: 'Plant a Seed' })
    navLinks.push({ href: '/messages', label: 'Messages' })
  }

  const mobileLinkClass = (href: string) => {
    const active = isActive(href)
    return 'block px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ' + (active
      ? 'bg-accent-soft text-accent'
      : 'text-secondary hover:text-primary hover:bg-surface-alt')
  }

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={profile ? '/projects' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sprout-500 to-sprout-700 flex items-center justify-center shadow-sm transition-shadow duration-200">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-primary">Sprout</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? 'bg-accent-soft text-accent'
                    : 'text-secondary hover:text-primary hover:bg-surface-alt'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {profile && (
              <Link
                href="/notifications"
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  isActive('/notifications')
                    ? 'bg-accent-soft text-accent'
                    : 'text-secondary hover:text-primary hover:bg-surface-alt'
                }`}
              >
                <Bell className="w-4 h-4" />
              </Link>
            )}

            <ThemeToggle />

            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-surface-alt hover:bg-border transition-all duration-200 group"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sprout-500 to-sprout-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {getInitials(profile.full_name || profile.username)}
                  </span>
                  <span className="text-sm font-semibold text-primary hidden lg:block">
                    {profile.full_name || profile.username}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-secondary transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl shadow-modal border border-border py-1.5 z-20 animate-scale-in overflow-hidden">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-semibold text-primary truncate">
                          {profile.full_name || profile.username}
                        </p>
                        <p className="text-xs text-secondary truncate">@{profile.username}</p>
                      </div>
                      <Link
                        href={'/profile/' + profile.username}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-accent-soft transition-colors duration-200"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-accent-soft transition-colors duration-200"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  href="/login"
                  className="text-secondary rounded-lg px-3 py-2 text-sm font-medium hover:text-primary hover:bg-surface-alt transition-all duration-200 active:scale-[0.98]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-accent text-accent-on rounded-lg px-4 py-2 text-sm font-semibold hover:bg-accent-hover transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-alt transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface backdrop-blur-lg animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-secondary">Navigation</span>
              <ThemeToggle />
            </div>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={mobileLinkClass(link.href)}>
                {link.label}
              </Link>
            ))}
            {profile ? (
              <>
                <Link href="/notifications" onClick={() => setMenuOpen(false)} className={mobileLinkClass('/notifications')}>Notifications</Link>
                <Link href={'/profile/' + profile.username} onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-surface-alt transition-colors duration-200">
                  Profile
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-surface-alt transition-colors duration-200">
                  Settings
                </Link>
                <div className="border-t border-border pt-2 mt-2">
                  <button
                    onClick={() => { handleSignOut(); setMenuOpen(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-border pt-2 mt-2 space-y-2 px-0">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 rounded-lg text-sm font-medium text-primary border border-border hover:bg-surface-alt transition-colors duration-200"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-on hover:bg-accent-hover transition-colors duration-200"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
