import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './LikeButton.module.css'

interface LikeButtonProps {
  conversationId: string
  likeCount: number
  hasLiked: boolean
  onLikeChange: (id: string, isLiked: boolean) => Promise<void> | void
  className?: string
}

export const LikeButton = ({
  conversationId,
  likeCount,
  hasLiked,
  onLikeChange,
  className = '',
}: LikeButtonProps) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Local state for optimistic UI updates
  const [isLiked, setIsLiked] = useState(hasLiked)
  const [count, setCount] = useState(likeCount)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate('/login')
      return
    }

    const newIsLiked = !isLiked
    const newCount = isLiked ? count - 1 : count + 1

    // Optimistic update
    setIsLiked(newIsLiked)
    setCount(newCount)

    if (newIsLiked) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    }

    try {
      await onLikeChange(conversationId, newIsLiked)
    } catch (_error) {
      // Revert on failure
      setIsLiked(isLiked)
      setCount(count)
    }
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${isLiked ? styles.liked : ''} ${isAnimating ? styles.pop : ''} ${className}`}
      onClick={handleToggle}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      aria-pressed={isLiked}
    >
      <span className={styles.icon}>{isLiked ? '❤️' : '🤍'}</span>
      <span className={styles.count}>{count}</span>
    </button>
  )
}
