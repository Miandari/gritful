'use client'

import { useEffect } from 'react'
import { MessageFeed } from './MessageFeed'
import { markMessagesAsRead, type ChallengeMessage } from '@/app/actions/challengeMessages'

interface UpdatesPageClientProps {
  initialMessages: ChallengeMessage[]
  challengeId: string
  currentUserId?: string
  isCreator: boolean
  total: number
  hasMore: boolean
}

export function UpdatesPageClient({
  initialMessages,
  challengeId,
  currentUserId,
  isCreator,
  total,
  hasMore,
}: UpdatesPageClientProps) {
  // Mark messages as read when the component mounts (client-side only)
  useEffect(() => {
    if (currentUserId) {
      markMessagesAsRead(challengeId).catch((error) => {
        console.error('Error marking messages as read:', error)
      })
    }
  }, [challengeId, currentUserId])

  return (
    <MessageFeed
      initialMessages={initialMessages}
      challengeId={challengeId}
      currentUserId={currentUserId}
      isCreator={isCreator}
      total={total}
      hasMore={hasMore}
    />
  )
}
