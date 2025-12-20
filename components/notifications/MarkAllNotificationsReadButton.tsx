'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { markAllNotificationsAsRead } from '@/app/actions/notifications'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function MarkAllNotificationsReadButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleMarkAllRead = async () => {
    setIsLoading(true)
    try {
      const result = await markAllNotificationsAsRead()
      if (result.success) {
        toast.success('All notifications marked as read')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to mark notifications as read')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAllRead}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Check className="mr-2 h-4 w-4" />
      )}
      Mark all read
    </Button>
  )
}
