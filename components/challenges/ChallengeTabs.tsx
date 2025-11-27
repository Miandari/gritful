'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Calendar, MessageSquare, Activity, Trophy } from 'lucide-react'

interface ChallengeTabsProps {
  challengeId: string
  participantCount?: number
  unreadCount?: number
  unreadActivityCount?: number
  isParticipant: boolean
  children?: React.ReactNode
}

type TabValue = 'overview' | 'progress' | 'feed' | 'updates' | 'entries' | 'achievements'

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
    if (pathname.includes('/feed')) return 'feed'
    if (pathname.includes('/updates')) return 'updates'
    if (pathname.includes('/entries')) return 'entries'
    if (pathname.includes('/achievements')) return 'achievements'
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
      case 'feed':
        router.push(`${baseUrl}/feed`)
        break
      case 'updates':
        router.push(`${baseUrl}/updates`)
        break
      case 'entries':
        router.push(`${baseUrl}/entries`)
        break
      case 'achievements':
        router.push(`${baseUrl}/achievements`)
        break
    }
  }

  // Calculate grid columns based on visible tabs
  // Participants: overview, progress, feed, updates, entries, achievements = 6
  // Non-participants: overview, feed, updates = 3
  const gridCols = isParticipant ? 'grid-cols-6' : 'grid-cols-3'

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className={`grid w-full ${gridCols} h-auto`}>
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

        {isParticipant && (
          <TabsTrigger value="achievements" className="flex-col sm:flex-row gap-1 px-2 py-2">
            <Trophy className="h-4 w-4 sm:mr-2" />
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm hidden sm:inline">Achievements</span>
              <span className="text-xs sm:hidden">Badges</span>
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
