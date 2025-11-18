'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCard } from './MessageCard'
import { Button } from '@/components/ui/button'
import {
  deleteChallengeMessage,
  updateChallengeMessage,
  type ChallengeMessage,
} from '@/app/actions/challengeMessages'
import { Loader2, ChevronDown } from 'lucide-react'

interface MessageFeedProps {
  initialMessages: ChallengeMessage[]
  challengeId: string
  currentUserId?: string
  isCreator: boolean
  total: number
  hasMore: boolean
}

export function MessageFeed({
  initialMessages,
  challengeId,
  currentUserId,
  isCreator,
  total,
  hasMore: initialHasMore,
}: MessageFeedProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [offset, setOffset] = useState(initialMessages.length)

  const handleLoadMore = async () => {
    setIsLoadingMore(true)

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/messages?offset=${offset}&limit=20`
      )
      const data = await response.json()

      if (data.messages) {
        setMessages([...messages, ...data.messages])
        setOffset(offset + data.messages.length)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePin = async (messageId: string, isPinned: boolean) => {
    const result = await updateChallengeMessage({
      messageId,
      isPinned,
    })

    if (!result.error) {
      // Update the message in the local state
      setMessages(
        messages.map((msg) =>
          msg.id === messageId ? { ...msg, is_pinned: isPinned } : msg
        )
      )
      router.refresh()
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    const result = await deleteChallengeMessage(messageId)

    if (!result.error) {
      // Remove the message from local state
      setMessages(messages.filter((msg) => msg.id !== messageId))
      router.refresh()
    }
  }

  const handleEdit = async (messageId: string) => {
    // TODO: Implement edit modal
    console.log('Edit message:', messageId)
  }

  const handleReply = async (messageId: string) => {
    // TODO: Implement reply functionality
    console.log('Reply to message:', messageId)
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No updates yet</p>
        <p className="text-sm">
          {isCreator
            ? 'Post your first update to keep participants informed!'
            : 'Check back later for updates from the challenge creator.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>
          {total} {total === 1 ? 'update' : 'updates'}
        </span>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            isCreator={isCreator}
            onPin={handlePin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={handleReply}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
