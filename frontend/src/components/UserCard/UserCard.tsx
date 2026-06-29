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

import React from 'react'

export const UserCard = React.memo(
  ({ user, isFollowing = false, onFollowChange }: UserCardProps) => {
    return (
      <div className={styles.card}>
        <Link to={`/profile/${user.username}`} className={styles.userInfo}>
          <div className={styles.avatar}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.details}>
            <div className={styles.nameRow}>
              {user.displayName && (
                <span className={styles.displayName}>{user.displayName}</span>
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
  },
)
