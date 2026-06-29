import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import type { Comment } from '../../types'
import styles from './CommentSection.module.css'

interface CommentSectionProps {
  conversationId: string
}

export const CommentSection = ({ conversationId }: CommentSectionProps) => {
  const { user, isAuthenticated } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true)
        const data = await api.get<{ data: Comment[] }>(
          `/conversations/${conversationId}/comments`,
        )
        setComments(data.data)
      } catch (_err) {
        setError('Failed to load comments')
      } finally {
        setIsLoading(false)
      }
    }
    fetchComments()
  }, [conversationId])

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
    } catch (_err) {
      setError('Failed to delete comment')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Comments ({comments.length})</h3>

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
      </div>
    </div>
  )
}
