'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Message as MsgType } from '@/lib/types'
import { encryptMessage, decryptMessage, importPublicKey } from '@/lib/crypto/e2ee'
import { ensureIdentityKeyPair, loadMyPrivateKey, loadMyPublicKey } from '@/lib/crypto/identity'

interface DecryptedMessage extends MsgType {
  decrypted: string
}

export function useMessages(
  conversationId: string,
  userId: string,
  otherUser: Profile,
) {
  const supabase = createClient()
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [e2eeReady, setE2eeReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const keysReady = useRef(false)

  // ── Setup E2EE keys ──
  useEffect(() => {
    let cancelled = false

    async function setup() {
      try {
        await ensureIdentityKeyPair(userId)

        const [myPriv, myPub] = await Promise.all([
          loadMyPrivateKey(userId),
          loadMyPublicKey(userId),
        ])

        if (!myPriv || !myPub) { setError('Failed to load encryption keys'); return }

        const { data: theirKeyRow } = await supabase
          .from('user_keys')
          .select('public_key')
          .eq('user_id', otherUser.id)
          .single()

        if (!theirKeyRow) { setError(`${otherUser.full_name ?? otherUser.username} has not set up encryption yet`); return }

        const theirPub = await importPublicKey(theirKeyRow.public_key)

        if (!cancelled) {
          ;(window as unknown as Record<string, unknown>).__e2ee_keys__ = { myPriv, myPub, theirPub }
          keysReady.current = true
          setE2eeReady(true)
        }
      } catch {
        if (!cancelled) setError('Encryption setup failed')
      }
    }

    setup()
    return () => { cancelled = true }
  }, [userId, otherUser.id, otherUser.full_name, otherUser.username, supabase])

  // ── Fetch message history ──
  useEffect(() => {
    if (!e2eeReady) return
    let cancelled = false

    async function fetchMessages() {
      setLoading(true)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (!msgs || cancelled) { setLoading(false); return }

      const keys = (window as unknown as Record<string, unknown>).__e2ee_keys__ as {
        myPriv: CryptoKey; myPub: CryptoKey; theirPub: CryptoKey
      }

      const decrypted = await Promise.all(
        msgs.map(async (msg) => {
          if (msg.sender_id === userId) {
            try {
              const text = await decryptMessage(
                msg.ciphertext_self!,
                msg.iv_self!,
                keys.myPriv,
                keys.myPub,
              )
              return { ...msg, decrypted: text } as DecryptedMessage
            } catch { return { ...msg, decrypted: '[Unable to decrypt]' } as DecryptedMessage }
          } else {
            try {
              const text = await decryptMessage(
                msg.ciphertext,
                msg.iv,
                keys.myPriv,
                keys.theirPub,
              )
              return { ...msg, decrypted: text } as DecryptedMessage
            } catch { return { ...msg, decrypted: '[Unable to decrypt]' } as DecryptedMessage }
          }
        }),
      )

      if (!cancelled) { setMessages(decrypted); setLoading(false) }
    }

    fetchMessages()
  }, [conversationId, e2eeReady, userId, supabase])

  // ── Realtime subscription ──
  useEffect(() => {
    if (!e2eeReady) return

    const keys = (window as unknown as Record<string, unknown>).__e2ee_keys__ as {
      myPriv: CryptoKey; myPub: CryptoKey; theirPub: CryptoKey
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as MsgType
          let decrypted = '[Encrypted]'

          if (newMsg.sender_id === userId && newMsg.ciphertext_self && newMsg.iv_self) {
            try {
              decrypted = await decryptMessage(
                newMsg.ciphertext_self,
                newMsg.iv_self,
                keys.myPriv,
                keys.myPub,
              )
            } catch { decrypted = '[Unable to decrypt]' }
          } else if (newMsg.sender_id !== userId) {
            try {
              decrypted = await decryptMessage(
                newMsg.ciphertext,
                newMsg.iv,
                keys.myPriv,
                keys.theirPub,
              )
            } catch { decrypted = '[Unable to decrypt]' }
          }

          setMessages((prev) => [...prev, { ...newMsg, decrypted } as DecryptedMessage])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, e2eeReady, userId, supabase])

  // ── Send message ──
  const sendMessage = useCallback(async (plaintext: string) => {
    if (!plaintext.trim() || sending || !e2eeReady) return

    const keys = (window as unknown as Record<string, unknown>).__e2ee_keys__ as {
      myPriv: CryptoKey; myPub: CryptoKey; theirPub: CryptoKey
    }

    setSending(true)
    try {
      const [toRecipient, toSelf] = await Promise.all([
        encryptMessage(plaintext, keys.myPriv, keys.theirPub),
        encryptMessage(plaintext, keys.myPriv, keys.myPub),
      ])

      const { error: insertErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        ciphertext: toRecipient.ciphertext,
        iv: toRecipient.iv,
        ciphertext_self: toSelf.ciphertext,
        iv_self: toSelf.iv,
      })

      if (insertErr) { setError('Failed to send message') }
    } catch {
      setError('Encryption failed')
    }
    setSending(false)
  }, [conversationId, userId, sending, e2eeReady, supabase])

  return { messages, loading, sending, e2eeReady, error, sendMessage, setError }
}
