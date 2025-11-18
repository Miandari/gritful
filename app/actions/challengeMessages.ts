'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ChallengeMessage {
  id: string
  challenge_id: string
  sender_id: string
  subject: string | null
  message: string
  sent_via_email: boolean
  recipient_count: number
  is_pinned: boolean
  created_at: string
  edited_at: string | null
  parent_message_id: string | null
  sender?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

export interface GetMessagesOptions {
  challengeId: string
  limit?: number
  offset?: number
  includeReplies?: boolean
}

/**
 * Get messages for a challenge with pagination
 */
export async function getChallengeMessages({
  challengeId,
  limit = 20,
  offset = 0,
  includeReplies = true,
}: GetMessagesOptions) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Build query
  let query = supabase
    .from('challenge_messages')
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq('challenge_id', challengeId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Optionally filter out replies (only show top-level messages)
  if (!includeReplies) {
    query = query.is('parent_message_id', null)
  }

  const { data: messages, error } = await query

  if (error) {
    console.error('Error fetching messages:', error)
    return { error: error.message }
  }

  // Get total count for pagination
  const { count } = await supabase
    .from('challenge_messages')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)

  return {
    messages: messages as ChallengeMessage[],
    total: count || 0,
    hasMore: (offset + limit) < (count || 0),
  }
}

/**
 * Get replies to a specific message
 */
export async function getMessageReplies(messageId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: replies, error } = await supabase
    .from('challenge_messages')
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq('parent_message_id', messageId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching replies:', error)
    return { error: error.message }
  }

  return { replies: replies as ChallengeMessage[] }
}

/**
 * Post a new message to a challenge
 */
export async function postChallengeMessage({
  challengeId,
  message,
  subject,
  parentMessageId,
}: {
  challengeId: string
  message: string
  subject?: string
  parentMessageId?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify user is challenge creator
  const { data: challenge } = await supabase
    .from('challenges')
    .select('creator_id')
    .eq('id', challengeId)
    .single()

  if (!challenge || challenge.creator_id !== user.id) {
    return { error: 'Only challenge creators can post messages' }
  }

  // Insert message
  const { data: newMessage, error } = await supabase
    .from('challenge_messages')
    .insert({
      challenge_id: challengeId,
      sender_id: user.id,
      message,
      subject: subject || null,
      parent_message_id: parentMessageId || null,
      sent_via_email: false,
    })
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .single()

  if (error) {
    console.error('Error posting message:', error)
    return { error: error.message }
  }

  revalidatePath(`/challenges/${challengeId}`)
  revalidatePath(`/challenges/${challengeId}/updates`)

  return { message: newMessage as ChallengeMessage }
}

/**
 * Update a message (for editing or pinning)
 */
export async function updateChallengeMessage({
  messageId,
  message,
  isPinned,
}: {
  messageId: string
  message?: string
  isPinned?: boolean
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Build update object
  const updateData: any = {}
  if (message !== undefined) {
    updateData.message = message
    updateData.edited_at = new Date().toISOString()
  }
  if (isPinned !== undefined) {
    updateData.is_pinned = isPinned
  }

  const { data: updatedMessage, error } = await supabase
    .from('challenge_messages')
    .update(updateData)
    .eq('id', messageId)
    .select(
      `
      *,
      sender:profiles!sender_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .single()

  if (error) {
    console.error('Error updating message:', error)
    return { error: error.message }
  }

  revalidatePath(`/challenges/${updatedMessage.challenge_id}`)
  revalidatePath(`/challenges/${updatedMessage.challenge_id}/updates`)

  return { message: updatedMessage as ChallengeMessage }
}

/**
 * Delete a message
 */
export async function deleteChallengeMessage(messageId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the message to find the challenge_id for revalidation
  const { data: message } = await supabase
    .from('challenge_messages')
    .select('challenge_id')
    .eq('id', messageId)
    .single()

  const { error } = await supabase
    .from('challenge_messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    return { error: error.message }
  }

  if (message) {
    revalidatePath(`/challenges/${message.challenge_id}`)
    revalidatePath(`/challenges/${message.challenge_id}/updates`)
  }

  return { success: true }
}

/**
 * Mark all messages as read for a participant
 */
export async function markMessagesAsRead(challengeId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('challenge_participants')
    .update({ last_message_read_at: new Date().toISOString() })
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error marking messages as read:', error)
    return { error: error.message }
  }

  revalidatePath(`/challenges/${challengeId}`)
  revalidatePath(`/challenges/${challengeId}/updates`)

  return { success: true }
}

/**
 * Get unread message count for a challenge
 */
export async function getUnreadMessageCount(challengeId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { count: 0 }
  }

  const { data, error } = await supabase.rpc('get_unread_message_count', {
    p_challenge_id: challengeId,
    p_user_id: user.id,
  })

  if (error) {
    console.error('Error getting unread count:', error)
    return { count: 0 }
  }

  return { count: data || 0 }
}
