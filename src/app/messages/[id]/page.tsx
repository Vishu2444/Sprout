import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConversationClient from './ConversationClient'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (!conversation) redirect('/messages')

  const isParticipant = conversation.user_a === user.id || conversation.user_b === user.id
  if (!isParticipant) redirect('/messages')

  const otherUserId = conversation.user_a === user.id ? conversation.user_b : conversation.user_a

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', otherUserId)
    .single()

  return (
    <ConversationClient
      conversationId={id}
      profile={profile!}
      otherProfile={otherProfile}
    />
  )
}
