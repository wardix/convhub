import { Link } from 'react-router-dom'
import type { Conversation } from '../../types'
import { LikeButton } from '../LikeButton/LikeButton'
import styles from './ConversationCard.module.css'

interface ConversationCardProps {
  conversation: Conversation
  onLikeToggle?: (id: string, currentStatus: boolean) => void
}

export const ConversationCard = ({
  conversation,
  onLikeToggle,
}: ConversationCardProps) => {
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
    <Link to={`/conversations/${conversation.id}`} className={styles.card}>
      <div className={styles.header}>
        <div className={styles.author}>
          <div className={styles.avatar}>
            {conversation.author.username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.username}>
              {conversation.author.username}
            </span>
            <span className={styles.time}>
              {formatTimeAgo(conversation.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{conversation.title}</h3>
        {conversation.description && (
          <p className={styles.description}>{conversation.description}</p>
        )}
      </div>

      <div className={styles.tags}>
        {conversation.tags?.map((tag) => (
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

      <div className={styles.footer}>
        <div className={styles.stats}>
          <span className={styles.stat} title="Views">
            👁️ {conversation.viewCount}
          </span>
          <span className={styles.stat} title="Comments">
            💬 {conversation.commentCount}
          </span>
          <span className={styles.stat} title="Messages">
            📝 {conversation.messageCount}
          </span>
        </div>

        {/* We wrap LikeButton in a div that stops propagation so clicking it doesn't trigger the Link */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Wrapper to stop propagation */}
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <LikeButton
            conversationId={conversation.id}
            likeCount={conversation.likeCount}
            hasLiked={conversation.hasLiked}
            onLikeChange={(id, isLiked) => {
              if (onLikeToggle) {
                // If the parent provided a toggle handler, use it.
                // Note: onLikeToggle expects currentStatus, but isLiked is the NEW status,
                // wait, the signature in ConversationCard is `currentStatus: boolean`.
                // So if isLiked is the NEW status, the OLD status is !isLiked.
                return Promise.resolve(onLikeToggle(id, !isLiked))
              }
              return Promise.resolve()
            }}
          />
        </div>
      </div>
    </Link>
  )
}
