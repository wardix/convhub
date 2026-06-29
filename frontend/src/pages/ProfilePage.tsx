import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { ConversationCard } from '../components/ConversationCard/ConversationCard'
import { FollowButton } from '../components/FollowButton/FollowButton'
import { UserCard } from '../components/UserCard/UserCard'
import { useAuth } from '../hooks/useAuth'
import type {
  Conversation,
  PaginatedResponse,
  User,
  UserProfile,
} from '../types'
import styles from './ProfilePage.module.css'

type Tab = 'conversations' | 'followers' | 'following'

export const ProfilePage = () => {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('conversations')

  // Tab Data states
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [usersList, setUsersList] = useState<User[]>([])
  const [isLoadingTab, setIsLoadingTab] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true)
        setError(null)
        const response = await api.get<{ user: UserProfile }>(
          `/users/${username}`,
        )
        setProfile(response.user)
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          (err as { status?: number }).status === 404
        ) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (username) {
      fetchProfile()
    }
  }, [username])

  // Fetch Tab Data
  useEffect(() => {
    const fetchTabData = async (pageNum: number, isLoadMore = false) => {
      if (!profile || !username) return

      try {
        setIsLoadingTab(true)
        let endpoint = ''

        if (activeTab === 'conversations') {
          endpoint = `/users/${username}/conversations?page=${pageNum}&limit=10`
        } else if (activeTab === 'followers') {
          endpoint = `/users/${profile.id}/followers?page=${pageNum}&limit=20`
        } else if (activeTab === 'following') {
          endpoint = `/users/${profile.id}/following?page=${pageNum}&limit=20`
        }

        if (activeTab === 'conversations') {
          const res = await api.get<PaginatedResponse<Conversation>>(endpoint)
          if (isLoadMore) {
            setConversations((prev) => [...prev, ...res.data])
          } else {
            setConversations(res.data)
          }
          setHasMore(pageNum < res.pagination.pages)
        } else {
          const res = await api.get<PaginatedResponse<User>>(endpoint)
          if (isLoadMore) {
            setUsersList((prev) => [...prev, ...res.data])
          } else {
            setUsersList(res.data)
          }
          setHasMore(pageNum < res.pagination.pages)
        }
      } catch (_err) {
        // Silent error for tab data, might add toast later
      } finally {
        setIsLoadingTab(false)
      }
    }

    fetchTabData(1, false)
    setPage(1)
  }, [profile, username, activeTab])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    // Actually the useEffect above depends on activeTab, so we just call a separate function or trigger it.
    // Let's manually fetch here to avoid complex useEffect dependencies.
    if (!profile || !username) return
    const fetchTabData = async () => {
      try {
        setIsLoadingTab(true)
        if (activeTab === 'conversations') {
          const res = await api.get<PaginatedResponse<Conversation>>(
            `/users/${username}/conversations?page=${nextPage}&limit=10`,
          )
          setConversations((prev) => [...prev, ...res.data])
          setHasMore(nextPage < res.pagination.pages)
        } else {
          const type = activeTab === 'followers' ? 'followers' : 'following'
          const res = await api.get<PaginatedResponse<User>>(
            `/users/${profile.id}/${type}?page=${nextPage}&limit=20`,
          )
          setUsersList((prev) => [...prev, ...res.data])
          setHasMore(nextPage < res.pagination.pages)
        }
      } catch (_err) {
      } finally {
        setIsLoadingTab(false)
      }
    }
    fetchTabData()
  }

  const handleFollowChange = (_userId: string, isFollowing: boolean) => {
    if (!profile) return
    setProfile({
      ...profile,
      isFollowing,
      followerCount: profile.followerCount + (isFollowing ? 1 : -1),
    })
  }

  if (isLoadingProfile) {
    return <div className={styles.loading}>Loading profile...</div>
  }

  if (error || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'User not found'}</div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <Helmet>
        <title>@{profile.username} — ConvHub</title>
        <meta
          name="description"
          content={`View the profile and conversations of ${profile.username} on ConvHub.`}
        />
      </Helmet>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>

          <div className={styles.info}>
            <h1 className={styles.displayName}>
              {profile.displayName || profile.username}
            </h1>
            <p className={styles.username}>@{profile.username}</p>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            <p className={styles.joinDate}>Member since {joinDate}</p>

            <div className={styles.stats}>
              <button
                type="button"
                className={styles.statButton}
                onClick={() => setActiveTab('conversations')}
              >
                <span className={styles.statValue}>
                  {profile.conversationCount}
                </span>
                <span className={styles.statLabel}>Conversations</span>
              </button>
              <button
                type="button"
                className={styles.statButton}
                onClick={() => setActiveTab('followers')}
              >
                <span className={styles.statValue}>
                  {profile.followerCount}
                </span>
                <span className={styles.statLabel}>Followers</span>
              </button>
              <button
                type="button"
                className={styles.statButton}
                onClick={() => setActiveTab('following')}
              >
                <span className={styles.statValue}>
                  {profile.followingCount}
                </span>
                <span className={styles.statLabel}>Following</span>
              </button>
            </div>

            <div className={styles.actions}>
              {isOwnProfile ? (
                <Link to="/settings" className={styles.editButton}>
                  Edit Profile
                </Link>
              ) : (
                <FollowButton
                  userId={profile.id}
                  isFollowing={profile.isFollowing}
                  onFollowChange={handleFollowChange}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'conversations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            Conversations
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'followers' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            Followers
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'following' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Following
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'conversations' &&
            (conversations.length === 0 && !isLoadingTab ? (
              <div className={styles.emptyState}>
                No conversations shared yet.
              </div>
            ) : (
              <div className={styles.grid}>
                {conversations.map((conv) => (
                  <ConversationCard key={conv.id} conversation={conv} />
                ))}
              </div>
            ))}

          {(activeTab === 'followers' || activeTab === 'following') &&
            (usersList.length === 0 && !isLoadingTab ? (
              <div className={styles.emptyState}>
                {activeTab === 'followers'
                  ? 'No followers yet.'
                  : 'Not following anyone yet.'}
              </div>
            ) : (
              <div className={styles.usersList}>
                {usersList.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            ))}

          {hasMore && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={handleLoadMore}
              disabled={isLoadingTab}
            >
              {isLoadingTab ? 'Loading...' : 'Load More'}
            </button>
          )}

          {isLoadingTab &&
            !hasMore &&
            conversations.length === 0 &&
            usersList.length === 0 && (
              <div className={styles.loading}>Loading...</div>
            )}
        </div>
      </div>
    </>
  )
}
