'use client'

import { formatDistanceToNow } from 'date-fns'
import { Pin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ChallengeMessage } from '@/app/actions/challengeMessages'

interface MessageCardProps {
  message: ChallengeMessage
  currentUserId?: string
  isCreator: boolean
  onPin?: (messageId: string, isPinned: boolean) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (messageId: string) => void
}

export function MessageCard({
  message,
  currentUserId,
  isCreator,
  onPin,
  onEdit,
  onDelete,
  onReply,
}: MessageCardProps) {
  const isOwnMessage = currentUserId === message.sender_id
  const canModify = isOwnMessage || isCreator

  const getAvatarFallback = () => {
    if (message.sender?.username) {
      return message.sender.username.slice(0, 2).toUpperCase()
    }
    if (message.sender?.full_name) {
      return message.sender.full_name.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getDisplayName = () => {
    return message.sender?.username || message.sender?.full_name || 'Unknown User'
  }

  return (
    <Card className={message.is_pinned ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{getDisplayName()}</span>
                {message.is_pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                {message.sent_via_email && (
                  <Badge variant="outline" className="text-xs">
                    Sent via email
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <time dateTime={message.created_at}>
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </time>
                {message.edited_at && <span>(edited)</span>}
              </div>
            </div>
          </div>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCreator && onPin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onPin(message.id, !message.is_pinned)}
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      {message.is_pinned ? 'Unpin' : 'Pin'} message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isOwnMessage && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canModify && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {message.subject && (
          <h3 className="font-semibold text-base mb-2">{message.subject}</h3>
        )}
        <div className="text-sm whitespace-pre-wrap break-words">{message.message}</div>

        {onReply && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message.id)}
              className="text-xs"
            >
              Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
