'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getComments, addComment } from '@/app/actions/activityFeed';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CommentSectionProps {
  activityId: string;
  currentUserId: string;
}

interface Comment {
  id: string;
  activity_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string | null;
  };
}

export function CommentSection({ activityId, currentUserId }: CommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [activityId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const result = await getComments({ activityId });
      setComments(result.comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await addComment({
        activityId,
        comment: newComment.trim(),
      });

      if (result.success) {
        setNewComment('');
        await loadComments();
        router.refresh();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Link href={`/profile/${comment.user.username}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={comment.user.avatar_url || undefined}
                    alt={comment.user.username}
                  />
                  <AvatarFallback>
                    {comment.user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="bg-accent rounded-lg p-3">
                  <Link
                    href={`/profile/${comment.user.username}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {comment.user.username}
                  </Link>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comment.comment}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground mt-1 ml-3">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[60px] resize-none"
          maxLength={500}
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newComment.trim() || isSubmitting}
          className="shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {newComment.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          {newComment.length} / 500
        </div>
      )}
    </div>
  );
}
