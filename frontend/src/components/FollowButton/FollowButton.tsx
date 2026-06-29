import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './FollowButton.module.css'

interface FollowButtonProps {
  userId: string
  isFollowing: boolean
  onFollowChange: (userId: string, isFollowing: boolean) => Promise<void> | void
  className?: string
}

export const FollowButton = ({
  userId,
  isFollowing,
  onFollowChange,
  className = '',
}: FollowButtonProps) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [following, setFollowing] = useState(isFollowing)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Don't show follow button for own profile
  if (user?.id === userId) {
    return null
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate('/login')
      return
    }

    if (isLoading) return

    const newFollowing = !following

    // Optimistic update
    setFollowing(newFollowing)

    try {
      setIsLoading(true)
      await onFollowChange(userId, newFollowing)
    } catch (_error) {
      // Revert on failure
      setFollowing(following)
    } finally {
      setIsLoading(false)
    }
  }

  let buttonText = following ? 'Following' : 'Follow'
  if (following && isHovered) {
    buttonText = 'Unfollow'
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${following ? styles.following : styles.follow} ${className}`}
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      aria-pressed={following}
    >
      {buttonText}
    </button>
  )
}
