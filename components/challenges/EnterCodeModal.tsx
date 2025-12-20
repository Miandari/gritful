'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { joinChallengeWithCode } from '@/app/actions/challenges'
import { Loader2, Key } from 'lucide-react'

interface EnterCodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function EnterCodeModal({ isOpen, onClose }: EnterCodeModalProps) {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await joinChallengeWithCode(inviteCode.trim().toUpperCase())

      if (result.success && result.challengeId) {
        onClose()
        router.push(`/challenges/${result.challengeId}`)
        router.refresh()
      } else {
        setError(result.error || 'Failed to join challenge')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setInviteCode('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Join with Invite Code
          </DialogTitle>
          <DialogDescription>
            Enter the 8-character invite code shared by the challenge creator
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="e.g., ABC12345"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              disabled={isLoading}
              className="text-center text-2xl font-mono tracking-wider"
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              The code is 8 characters and not case sensitive
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || inviteCode.length !== 8}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Joining...' : 'Join Challenge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
