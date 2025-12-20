'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Key, Loader2 } from 'lucide-react'
import { submitJoinRequest } from '@/app/actions/joinRequests'
import { useRouter } from 'next/navigation'
import EnterCodeModal from './EnterCodeModal'

interface JoinPrivateChallengeButtonsProps {
  challengeId: string
  challengeName: string
}

export default function JoinPrivateChallengeButtons({
  challengeId,
  challengeName,
}: JoinPrivateChallengeButtonsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  const handleRequest = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsSubmitting(true)
    setError('')

    const result = await submitJoinRequest(challengeId)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Failed to send request')
      setIsSubmitting(false)
    }
  }

  const handleOpenCodeModal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCodeModalOpen(true)
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRequest}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Sending...' : 'Request to Join'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleOpenCodeModal}
          disabled={isSubmitting}
          className="flex-1"
        >
          <Key className="mr-2 h-4 w-4" />
          Enter Code
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
      <EnterCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  )
}
