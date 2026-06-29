import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { Comment, PaginatedResponse } from '../../types'
import { formatTimeAgo } from '../../utils/formatDate'
import styles from './CommentSection.module.css'

interface CommentSectionProps {
  conversationId: string
}

export const CommentSection = ({ conversationId }: CommentSectionProps) => {
  const { user, isAuthenticated } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchComments = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        if (reset) setIsLoading(true)
        else setIsLoadingMore(true)

        const data = await api.get<PaginatedResponse<Comment>>(
          `/conversations/${conversationId}/comments?page=${pageNum}&limit=20`,
        )

        setComments((prev) => (reset ? data.data : [...prev, ...data.data]))
        setTotalCount(data.pagination.total)
        setHasMore(pageNum < data.pagination.pages)
        setPage(pageNum)
      } catch (_err) {
        setError('Failed to load comments')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [conversationId],
  )

  useEffect(() => {
    fetchComments(1, true)
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      const data = await api.post<{ comment: Comment }>(
        `/conversations/${conversationId}/comments`,
        {
          content: newComment.trim(),
        },
      )

      setComments((prev) => [data.comment, ...prev])
      setTotalCount((prev) => prev + 1)
      setNewComment('')
    } catch (_err) {
      setError('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    try {
      await api.delete(`/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setTotalCount((prev) => Math.max(0, prev - 1))
    } catch (_err) {
      setError('Failed to delete comment')
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Comments ({totalCount})</h3>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputArea}>
        {!isAuthenticated ? (
          <div className={styles.loginPrompt}>
            <p>
              Please{' '}
              <Link to="/login" className={styles.link}>
                log in
              </Link>{' '}
              to leave a comment.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <textarea
              className={styles.textarea}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={2000}
              rows={3}
            />
            <div className={styles.formFooter}>
              <span className={styles.charCount}>
                {newComment.length} / 2000
              </span>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className={styles.commentList}>
        {isLoading ? (
          <div className={styles.loading}>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <Link
                to={`/profile/${comment.author.username}`}
                className={styles.avatar}
              >
                {comment.author.username.charAt(0).toUpperCase()}
              </Link>
              <div className={styles.commentContent}>
                <div className={styles.commentHeader}>
                  <Link
                    to={`/profile/${comment.author.username}`}
                    className={styles.username}
                  >
                    {comment.author.username}
                  </Link>
                  <span className={styles.time}>
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className={styles.text}>{comment.content}</p>
                {user?.id === comment.author.id && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(comment.id)}
                    title="Delete comment"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {hasMore && comments.length > 0 && (
          <div className={styles.loadMoreContainer}>
            <button
              type="button"
              className={styles.loadMoreBtn}
              onClick={() => fetchComments(page + 1)}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load More Comments'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
