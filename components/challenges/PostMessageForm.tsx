'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { postChallengeMessage } from '@/app/actions/challengeMessages'
import { sendChallengeUpdate } from '@/app/actions/sendChallengeUpdate'
import { Loader2, Send, Mail } from 'lucide-react'

interface PostMessageFormProps {
  challengeId: string
  parentMessageId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
  showSubject?: boolean
  participantCount?: number
}

export function PostMessageForm({
  challengeId,
  parentMessageId,
  onSuccess,
  onCancel,
  placeholder = 'Write your message...',
  showSubject = true,
  participantCount = 0,
}: PostMessageFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }

    // Require subject if sending email
    if (sendEmail && !subject.trim()) {
      setError('Subject is required when sending email notifications')
      return
    }

    setIsSubmitting(true)

    try {
      if (sendEmail && !parentMessageId) {
        // Send as email + in-app update
        const result = await sendChallengeUpdate(
          challengeId,
          subject.trim(),
          message.trim()
        )

        if (result.error) {
          setError(result.error)
          setIsSubmitting(false)
          return
        }

        setSuccessMessage(
          `Update posted and email sent to ${result.emailCount || 0} participant${
            result.emailCount !== 1 ? 's' : ''
          }`
        )
      } else {
        // Post as in-app only
        const result = await postChallengeMessage({
          challengeId,
          message: message.trim(),
          subject: subject.trim() || undefined,
          parentMessageId,
        })

        if (result.error) {
          setError(result.error)
          setIsSubmitting(false)
          return
        }

        setSuccessMessage('Update posted successfully')
      }

      // Reset form
      setSubject('')
      setMessage('')
      setSendEmail(false)

      // Call success callback or refresh after a brief delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
      }, 1500)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error posting update:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {parentMessageId ? 'Post Reply' : 'Post Update'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showSubject && !parentMessageId && (
            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject {sendEmail && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject line..."
                maxLength={200}
                disabled={isSubmitting}
                required={sendEmail}
              />
              {sendEmail && (
                <p className="text-xs text-muted-foreground">
                  Subject is required for email notifications
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              rows={parentMessageId ? 4 : 6}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              {message.length} characters
            </p>
          </div>

          {!parentMessageId && participantCount > 0 && (
            <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  disabled={isSubmitting}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="sendEmail"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    Send email notification to all participants
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {participantCount} participant{participantCount !== 1 ? 's' : ''} will receive
                    this update via email (only those who opted in)
                  </p>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {sendEmail ? 'Sending...' : 'Posting...'}
                </>
              ) : (
                <>
                  {sendEmail ? (
                    <Mail className="mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {sendEmail
                    ? 'Post & Send Email'
                    : `Post ${parentMessageId ? 'Reply' : 'Update'}`}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
