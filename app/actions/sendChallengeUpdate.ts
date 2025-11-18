'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SendChallengeUpdateResult {
  success: boolean
  error?: string
  emailCount?: number
}

export async function sendChallengeUpdate(
  challengeId: string,
  subject: string,
  message: string,
  recipientUserIds?: string[]
): Promise<SendChallengeUpdateResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Verify user is challenge creator
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('creator_id, name')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return { success: false, error: 'Challenge not found' }
    }

    if (challenge.creator_id !== user.id) {
      return { success: false, error: 'Only challenge creator can send updates' }
    }

    // Get creator's profile info
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .single()

    const senderName = creatorProfile?.full_name || creatorProfile?.username || 'Challenge Creator'

    // Get active participant IDs - either from parameter or all active participants
    let userIds: string[]

    if (recipientUserIds && recipientUserIds.length > 0) {
      // If specific recipients are provided, verify they are active participants
      const { data: participants, error: participantsError } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'active')
        .in('user_id', recipientUserIds)

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        return { success: false, error: 'Failed to fetch participants' }
      }

      if (!participants || participants.length === 0) {
        return { success: false, error: 'None of the selected users are active participants' }
      }

      userIds = participants.map((p) => p.user_id)
    } else {
      // Get all active participants
      const { data: participants, error: participantsError } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'active')

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        return { success: false, error: 'Failed to fetch participants' }
      }

      if (!participants || participants.length === 0) {
        return { success: false, error: 'No participants found' }
      }

      userIds = participants.map((p) => p.user_id)
    }

    // Get user IDs and email addresses for opted-in users using our RPC function
    // This function checks email preferences and only returns confirmed emails

    const { data: usersWithEmail, error: emailError } = await supabase.rpc(
      'get_user_emails_for_challenge_update',
      {
        p_user_ids: userIds,
        p_challenge_id: challengeId,
      }
    )

    if (emailError) {
      console.error('Error fetching user emails:', emailError)
      return { success: false, error: 'Failed to fetch user emails' }
    }

    if (!usersWithEmail || usersWithEmail.length === 0) {
      return {
        success: false,
        error: 'No participants have opted in to receive challenge update emails',
      }
    }

    // Create queue entries with actual emails
    const queueEntries = usersWithEmail.map((user) => ({
      user_id: user.user_id,
      email_type: 'challenge_update' as const,
      recipient_email: user.email,
      subject: subject,
      template_name: 'challenge_update',
      template_data: {
        username: user.username || user.full_name || 'there',
        sender_name: senderName,
        challenge_name: challenge.name,
        message: message,
        challenge_id: challengeId,
      },
      scheduled_for: new Date().toISOString(),
    }))

    if (queueEntries.length === 0) {
      return { success: false, error: 'No valid email addresses found' }
    }

    // Insert into email queue
    const { error: queueError } = await supabase.from('email_queue').insert(queueEntries)

    if (queueError) {
      console.error('Error queueing emails:', queueError)
      return { success: false, error: 'Failed to queue emails' }
    }

    // Create a message record in challenge_messages table
    // This preserves the email content in the in-app message feed
    const { error: messageError } = await supabase
      .from('challenge_messages')
      .insert({
        challenge_id: challengeId,
        sender_id: user.id,
        subject: subject,
        message: message,
        sent_via_email: true,
        recipient_count: queueEntries.length,
      })

    if (messageError) {
      console.error('Error creating message record:', messageError)
      // Don't fail the action - emails are already queued
      // Just log the error since message creation is secondary
    }

    // Trigger email processor to send emails immediately
    try {
      const processorUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-processor`
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (processorUrl && serviceRoleKey) {
        // Fire and forget - don't wait for response
        fetch(processorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
        }).catch((err) => {
          // Log but don't fail the action - emails are queued and will be retried
          console.error('Error triggering email processor:', err)
        })
      }
    } catch (err) {
      // Log but don't fail - emails are safely queued
      console.error('Error calling email processor:', err)
    }

    // Revalidate challenge page
    revalidatePath(`/challenges/${challengeId}`)

    return {
      success: true,
      emailCount: queueEntries.length,
    }
  } catch (error) {
    console.error('Error in sendChallengeUpdate:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    }
  }
}
