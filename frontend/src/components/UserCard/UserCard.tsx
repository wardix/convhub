import { Link } from 'react-router-dom'
import type { User } from '../../types'
import { FollowButton } from '../FollowButton/FollowButton'
import styles from './UserCard.module.css'

interface UserCardProps {
  user: User
  isFollowing?: boolean
  onFollowChange?: (
    userId: string,
    isFollowing: boolean,
  ) => Promise<void> | void
}

export const UserCard = ({
  user,
  isFollowing = false,
  onFollowChange,
}: UserCardProps) => {
  return (
    <div className={styles.card}>
      <Link to={`/users/${user.username}`} className={styles.userInfo}>
        <div className={styles.avatar}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className={styles.details}>
          <div className={styles.nameRow}>
            {user.display_name && (
              <span className={styles.displayName}>{user.display_name}</span>
            )}
            <span className={styles.username}>@{user.username}</span>
          </div>
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
        </div>
      </Link>

      {onFollowChange && (
        <div className={styles.actions}>
          <FollowButton
            userId={user.id}
            isFollowing={isFollowing}
            onFollowChange={onFollowChange}
          />
        </div>
      )}
    </div>
  )
}
