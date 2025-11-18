'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { sendChallengeUpdate } from '@/app/actions/sendChallengeUpdate'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Mail, Users, CheckSquare, Square, Search } from 'lucide-react'

interface Participant {
  user_id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface SendUpdateModalProps {
  challengeId: string
  challengeName: string
  participantCount: number
  isOpen: boolean
  onClose: () => void
  preselectedParticipantIds?: string[]
}

export default function SendUpdateModal({
  challengeId,
  challengeName,
  participantCount,
  isOpen,
  onClose,
  preselectedParticipantIds,
}: SendUpdateModalProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch participants when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchParticipants()
    }
  }, [isOpen, challengeId])

  const fetchParticipants = async () => {
    setIsLoadingParticipants(true)
    try {
      const supabase = createClient()

      // Fetch participants (without join to avoid schema cache issues)
      const { data: participantsData, error: participantsError } = await supabase
        .from('challenge_participants')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('status', 'active')

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        toast.error('Failed to load participants')
        return
      }

      if (!participantsData || participantsData.length === 0) {
        setParticipants([])
        setSelectedParticipantIds(new Set())
        return
      }

      // Fetch profiles separately
      const userIds = participantsData.map(p => p.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        toast.error('Failed to load participant profiles')
        return
      }

      // Create a map of user_id to profile
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || [])

      // Merge participants with profiles
      const transformedParticipants: Participant[] = participantsData.map(p => {
        const profile = profileMap.get(p.user_id)
        return {
          user_id: p.user_id,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        }
      })

      setParticipants(transformedParticipants)

      // Select participants based on preselectedParticipantIds or all by default
      if (preselectedParticipantIds && preselectedParticipantIds.length > 0) {
        const preselectedSet = new Set(preselectedParticipantIds)
        setSelectedParticipantIds(preselectedSet)
      } else {
        const allIds = new Set(transformedParticipants.map(p => p.user_id))
        setSelectedParticipantIds(allIds)
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
      toast.error('Failed to load participants')
    } finally {
      setIsLoadingParticipants(false)
    }
  }

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const allIds = new Set(participants.map(p => p.user_id))
    setSelectedParticipantIds(allIds)
  }

  const selectNone = () => {
    setSelectedParticipantIds(new Set())
  }

  const handleSend = async () => {
    // Validation
    if (!subject.trim()) {
      toast.error('Please enter a subject')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (subject.length > 200) {
      toast.error('Subject must be less than 200 characters')
      return
    }

    if (message.length > 5000) {
      toast.error('Message must be less than 5000 characters')
      return
    }

    if (selectedParticipantIds.size === 0) {
      toast.error('Please select at least one participant')
      return
    }

    setIsSending(true)

    try {
      const recipientUserIds = Array.from(selectedParticipantIds)
      const result = await sendChallengeUpdate(challengeId, subject, message, recipientUserIds)

      if (result.success) {
        toast.success(
          `Update sent successfully! ${result.emailCount} ${
            result.emailCount === 1 ? 'participant' : 'participants'
          } will receive your message.`
        )
        // Reset form
        setSubject('')
        setMessage('')
        setSelectedParticipantIds(new Set())
        onClose()
      } else {
        toast.error(result.error || 'Failed to send update')
      }
    } catch (error) {
      console.error('Error sending update:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      // Reset form on close
      setSubject('')
      setMessage('')
      setSelectedParticipantIds(new Set())
      setSearchQuery('')
      onClose()
    }
  }

  const getParticipantDisplayName = (participant: Participant) => {
    return participant.username || participant.full_name || 'Unknown User'
  }

  // Filter participants based on search query
  const filteredParticipants = participants.filter(participant => {
    if (!searchQuery.trim()) return true
    const displayName = getParticipantDisplayName(participant).toLowerCase()
    return displayName.includes(searchQuery.toLowerCase())
  })

  // Select all filtered participants
  const selectAllFiltered = () => {
    setSelectedParticipantIds(prev => {
      const newSet = new Set(prev)
      filteredParticipants.forEach(p => newSet.add(p.user_id))
      return newSet
    })
  }

  // Deselect all filtered participants
  const deselectAllFiltered = () => {
    setSelectedParticipantIds(prev => {
      const newSet = new Set(prev)
      filteredParticipants.forEach(p => newSet.delete(p.user_id))
      return newSet
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Participants
          </DialogTitle>
          <DialogDescription>
            Send an update to all participants in <strong>{challengeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Recipients <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={searchQuery ? selectAllFiltered : selectAll}
                  disabled={isSending || isLoadingParticipants || filteredParticipants.length === 0}
                  className="h-7 text-xs"
                >
                  <CheckSquare className="mr-1 h-3 w-3" />
                  {searchQuery ? 'Select Filtered' : 'Select All'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={searchQuery ? deselectAllFiltered : selectNone}
                  disabled={isSending || isLoadingParticipants || selectedParticipantIds.size === 0}
                  className="h-7 text-xs"
                >
                  <Square className="mr-1 h-3 w-3" />
                  {searchQuery ? 'Clear Filtered' : 'Clear All'}
                </Button>
              </div>
            </div>

            {/* Search field */}
            {!isLoadingParticipants && participants.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search participants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSending}
                  className="pl-9"
                />
              </div>
            )}

            {/* Loading state */}
            {isLoadingParticipants && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading participants...
              </div>
            )}

            {/* Participants list */}
            {!isLoadingParticipants && participants.length > 0 && (
              <>
                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant) => (
                      <div
                        key={participant.user_id}
                        className="flex items-center space-x-3 p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-pointer"
                        onClick={() => toggleParticipant(participant.user_id)}
                      >
                        <Checkbox
                          checked={selectedParticipantIds.has(participant.user_id)}
                          onCheckedChange={() => toggleParticipant(participant.user_id)}
                          disabled={isSending}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getParticipantDisplayName(participant)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">No participants match "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* No participants */}
            {!isLoadingParticipants && participants.length === 0 && (
              <div className="border rounded-lg p-6 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No participants found</p>
              </div>
            )}

            {/* Selection count */}
            {!isLoadingParticipants && participants.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  {selectedParticipantIds.size} of {participants.length} participants selected
                </p>
                {searchQuery && filteredParticipants.length < participants.length && (
                  <p>
                    Showing {filteredParticipants.length} of {participants.length}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {subject.length}/200 characters
            </p>
          </div>

          {/* Message field */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Enter your message to participants..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={6}
              maxLength={5000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/5000 characters
            </p>
          </div>

          {/* Note about unsubscribe */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-900 dark:text-blue-100">
            <p>
              <strong>Note:</strong> All emails include an unsubscribe link. Recipients can opt out
              of challenge updates at any time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              isSending ||
              !subject.trim() ||
              !message.trim() ||
              selectedParticipantIds.size === 0
            }
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSending
              ? 'Sending...'
              : `Send to ${selectedParticipantIds.size} ${
                  selectedParticipantIds.size === 1 ? 'Participant' : 'Participants'
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
