'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import SendUpdateModal from './SendUpdateModal'

interface EmailParticipantsButtonProps {
  challengeId: string
  challengeName: string
  participantCount: number
}

export default function EmailParticipantsButton({
  challengeId,
  challengeName,
  participantCount,
}: EmailParticipantsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          setIsModalOpen(true)
        }}
        className="cursor-pointer"
      >
        <Mail className="mr-2 h-4 w-4" />
        Email Participants
      </DropdownMenuItem>

      <SendUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        challengeId={challengeId}
        challengeName={challengeName}
        participantCount={participantCount}
      />
    </>
  )
}
