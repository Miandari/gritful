'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SendUpdateModal from './SendUpdateModal'

interface EmailParticipantButtonProps {
  challengeId: string
  challengeName: string
  participantUserId: string
  participantUsername: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function EmailParticipantButton({
  challengeId,
  challengeName,
  participantUserId,
  participantUsername,
  variant = 'outline',
  size = 'sm',
}: EmailParticipantButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={variant}
        size={size}
      >
        <Mail className="mr-2 h-4 w-4" />
        Email {participantUsername}
      </Button>

      <SendUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        challengeId={challengeId}
        challengeName={challengeName}
        participantCount={1}
        preselectedParticipantIds={[participantUserId]}
      />
    </>
  )
}
