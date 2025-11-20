'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Users, Calendar, MessageSquare, Activity } from 'lucide-react'

interface ChallengeTabsProps {
  challengeId: string
  participantCount?: number
  unreadCount?: number
  unreadActivityCount?: number
  isParticipant: boolean
  children?: React.ReactNode
}

type TabValue = 'overview' | 'progress' | 'participants' | 'feed' | 'updates' | 'entries'

export function ChallengeTabs({
  challengeId,
  participantCount = 0,
  unreadCount = 0,
  unreadActivityCount = 0,
  isParticipant,
  children,
}: ChallengeTabsProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Determine active tab from pathname
  const getActiveTab = (): TabValue => {
    if (pathname.includes('/progress')) return 'progress'
    if (pathname.includes('/participants')) return 'participants'
    if (pathname.includes('/feed')) return 'feed'
    if (pathname.includes('/updates')) return 'updates'
    if (pathname.includes('/entries')) return 'entries'
    return 'overview'
  }

  const activeTab = getActiveTab()

  const handleTabChange = (value: string) => {
    const baseUrl = `/challenges/${challengeId}`

    switch (value) {
      case 'overview':
        router.push(baseUrl)
        break
      case 'progress':
        router.push(`${baseUrl}/progress`)
        break
      case 'participants':
        router.push(`${baseUrl}/participants`)
        break
      case 'feed':
        router.push(`${baseUrl}/feed`)
        break
      case 'updates':
        router.push(`${baseUrl}/updates`)
        break
      case 'entries':
        router.push(`${baseUrl}/entries`)
        break
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-6 h-auto">
        <TabsTrigger value="overview" className="flex-col sm:flex-row gap-1 px-2 py-2">
          <BarChart3 className="h-4 w-4 sm:mr-2" />
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm">Overview</span>
          </div>
        </TabsTrigger>

        {isParticipant && (
          <TabsTrigger value="progress" className="flex-col sm:flex-row gap-1 px-2 py-2">
            <Calendar className="h-4 w-4 sm:mr-2" />
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm">Progress</span>
            </div>
          </TabsTrigger>
        )}

        <TabsTrigger value="participants" className="flex-col sm:flex-row gap-1 px-2 py-2">
          <Users className="h-4 w-4 sm:mr-2" />
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm hidden sm:inline">Participants</span>
            <span className="text-xs sm:hidden">People</span>
            {participantCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {participantCount}
              </Badge>
            )}
          </div>
        </TabsTrigger>

        <TabsTrigger value="feed" className="flex-col sm:flex-row gap-1 px-2 py-2 relative">
          <Activity className="h-4 w-4 sm:mr-2" />
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm">Feed</span>
            {unreadActivityCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadActivityCount}
              </Badge>
            )}
          </div>
        </TabsTrigger>

        <TabsTrigger value="updates" className="flex-col sm:flex-row gap-1 px-2 py-2 relative">
          <MessageSquare className="h-4 w-4 sm:mr-2" />
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm">Updates</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </TabsTrigger>

        {isParticipant && (
          <TabsTrigger value="entries" className="flex-col sm:flex-row gap-1 px-2 py-2">
            <Calendar className="h-4 w-4 sm:mr-2" />
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm">Entries</span>
            </div>
          </TabsTrigger>
        )}
      </TabsList>

      {/* Tab contents are rendered by page components */}
      <div className="mt-6">
        {children}
      </div>
    </Tabs>
  )
}
