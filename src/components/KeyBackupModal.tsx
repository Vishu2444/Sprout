'use client'

import { useState } from 'react'
import { createKeyBackup, restoreKeyBackup } from '@/lib/crypto/identity'
import { X, Loader2, KeyRound } from 'lucide-react'

export default function KeyBackupModal({
  userId,
  mode,
  onClose,
  onSuccess,
}: {
  userId: string
  mode: 'create' | 'restore'
  onClose: () => void
  onSuccess: () => void
}) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = mode === 'create'

  const handleSubmit = async () => {
    if (loading) return
    if (passphrase.length < 8) {
      setError('Use at least 8 characters')
      return
    }
    if (isCreate && passphrase !== confirm) {
      setError('Passphrases do not match')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (isCreate) {
        await createKeyBackup(userId, passphrase)
      } else {
        await restoreKeyBackup(userId, passphrase)
      }
      onSuccess()
    } catch {
      setError(isCreate ? 'Could not save backup. Please try again.' : 'Incorrect passphrase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-primary">
            {isCreate ? 'Set up key backup' : 'Restore encryption key'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-alt transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm text-secondary">
              {isCreate
                ? 'Pick a passphrase you will remember. It encrypts a copy of your private key so you can recover your messages on any new device.'
                : 'Enter the backup passphrase you set up on your original device to unlock your message history here.'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Backup passphrase"
                autoComplete="off"
                className="w-full bg-surface-alt rounded-xl px-4 py-3 text-sm text-primary placeholder:text-secondary border border-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-all duration-200"
              />
              {isCreate && (
                <p className="text-[11px] text-secondary mt-1">At least 8 characters</p>
              )}
            </div>
            {isCreate && (
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm passphrase"
                autoComplete="off"
                className="w-full bg-surface-alt rounded-xl px-4 py-3 text-sm text-primary placeholder:text-secondary border border-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-all duration-200"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-accent text-accent-on rounded-xl px-4 py-3 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCreate ? 'Encrypting key...' : 'Unlocking...'}
              </>
            ) : isCreate ? (
              'Encrypt and save backup'
            ) : (
              'Restore key'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
