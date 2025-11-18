'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { PostUpdateModal } from './PostUpdateModal'

interface PostUpdateButtonProps {
  challengeId: string
  participantCount: number
}

export function PostUpdateButton({ challengeId, participantCount }: PostUpdateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="default" className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Post Update
      </Button>

      <PostUpdateModal
        challengeId={challengeId}
        participantCount={participantCount}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
