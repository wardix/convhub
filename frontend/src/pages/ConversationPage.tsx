import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { CommentSection } from '../components/CommentSection/CommentSection'
import { ConversationViewer } from '../components/ConversationViewer/ConversationViewer'
import { LikeButton } from '../components/LikeButton/LikeButton'
import { useAuth } from '../hooks/useAuth'
import type { ConversationDetail } from '../types'
import styles from './ConversationPage.module.css'

export const ConversationPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setIsLoading(true)
        const data = await api.get<ConversationDetail>(`/conversations/${id}`)
        setConversation(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load conversation',
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchConversation()
    }
  }, [id])

  const handleLikeChange = async (targetId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await api.post(`/conversations/${targetId}/like`)
        setConversation((prev) =>
          prev
            ? { ...prev, hasLiked: true, likeCount: prev.likeCount + 1 }
            : null,
        )
      } else {
        await api.delete(`/conversations/${targetId}/like`)
        setConversation((prev) =>
          prev
            ? { ...prev, hasLiked: false, likeCount: prev.likeCount - 1 }
            : null,
        )
      }
    } catch (err) {
      console.error('Failed to toggle like', err)
      throw err // Throw so LikeButton can revert its local optimistic state
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      setIsDeleting(true)
      await api.delete(`/conversations/${id}`)
      navigate('/')
    } catch (err) {
      console.error('Failed to delete conversation', err)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading conversation...</p>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className={styles.errorContainer}>
        <h2>Oops!</h2>
        <p>{error || 'Conversation not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className={styles.btn}
        >
          Go back home
        </button>
      </div>
    )
  }

  const isAuthor = user?.id === conversation.author.id

  return (
    <>
      <Helmet>
        <title>
          {conversation.title} by {conversation.author.username} — ConvHub
        </title>
        <meta
          name="description"
          content={
            conversation.description ||
            `Read this AI conversation by ${conversation.author.username} on ConvHub.`
          }
        />
      </Helmet>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>{conversation.title}</h1>

          <div className={styles.meta}>
            <div className={styles.author}>
              <div className={styles.avatar}>
                {conversation.author.username.charAt(0).toUpperCase()}
              </div>
              <div className={styles.authorInfo}>
                <span className={styles.username}>
                  {conversation.author.username}
                </span>
                <span className={styles.date}>
                  {new Date(conversation.createdAt).toLocaleDateString(
                    undefined,
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    },
                  )}
                </span>
              </div>
            </div>

            <div className={styles.stats}>
              <span className={styles.stat} title="Views">
                👁️ {conversation.viewCount}
              </span>
              <span className={styles.stat} title="Messages">
                💬 {conversation.messageCount}
              </span>
            </div>
          </div>

          {conversation.tags && conversation.tags.length > 0 && (
            <div className={styles.tags}>
              {conversation.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={styles.tag}
                  style={{
                    backgroundColor: tag.color
                      ? `${tag.color}20`
                      : 'var(--bg-secondary)',
                    color: tag.color || 'var(--text-secondary)',
                  }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {conversation.description && (
            <p className={styles.description}>{conversation.description}</p>
          )}

          {/* Action Bar */}
          <div className={styles.actionBar}>
            <LikeButton
              conversationId={conversation.id}
              likeCount={conversation.likeCount}
              hasLiked={conversation.hasLiked}
              onLikeChange={handleLikeChange}
            />

            {isAuthor && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : '🗑️ Delete'}
              </button>
            )}
          </div>
        </header>

        {/* Transcript Viewer */}
        <main className={styles.main}>
          {conversation.transcript ? (
            <ConversationViewer transcript={conversation.transcript} />
          ) : (
            <div className={styles.emptyTranscript}>
              No transcript available for this conversation.
            </div>
          )}
        </main>

        {/* Comment section */}
        <CommentSection conversationId={conversation.id} />
      </div>
    </>
  )
}
