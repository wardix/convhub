import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ConversationCard } from '../components/ConversationCard/ConversationCard'
import { ConversationCardSkeleton } from '../components/Skeleton'
import type { Conversation, PaginatedResponse, Tag } from '../types'
import { mapConversation, mapTag } from '../utils/mappers'
import styles from './HomePage.module.css'

export const HomePage = () => {
  const [trending, setTrending] = useState<Conversation[]>([])
  const [recent, setRecent] = useState<Conversation[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setIsLoading(true)
        const [trendingData, recentData, tagsData] = await Promise.all([
          api.get<{ data: Conversation[] }>('/conversations/trending'),
          api.get<PaginatedResponse<Conversation>>(
            '/conversations?sort=recent&limit=8',
          ),
          api.get<{ data: Tag[] }>('/tags'),
        ])

        setTrending(trendingData.data.map(mapConversation))
        setRecent(recentData.data.map(mapConversation))
        setTags(tagsData.data.map(mapTag).slice(0, 15)) // Show top 15 tags
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load home data',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  const handleTagClick = (tagName: string) => {
    navigate(`/explore?tag=${encodeURIComponent(tagName)}`)
  }

  return (
    <>
      <Helmet>
        <title>ConvHub — Share Your AI Conversations</title>
        <meta
          name="description"
          content="Discover and share the best AI conversations from Antigravity and other assistants."
        />
      </Helmet>
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Share Your AI Conversations with the World
            </h1>
            <p className={styles.heroSubtitle}>
              ConvHub is the place to discover, share, and discuss fascinating
              AI interactions. Think of it as "GitHub Gists for AI
              conversations".
            </p>
            <div className={styles.heroActions}>
              <Link to="/upload" className={styles.primaryBtn}>
                Upload a Conversation
              </Link>
              <Link to="/explore" className={styles.secondaryBtn}>
                Browse Conversations
              </Link>
            </div>
          </div>

          {/* Animated background elements */}
          <div className={styles.blob1} />
          <div className={styles.blob2} />
        </section>

        <main className={styles.main}>
          {error ? (
            <div className={styles.errorContainer}>
              <h2>Oops!</h2>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={styles.btn}
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Skeletons are static and order doesn't change
                <ConversationCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : (
            <>
              {/* Trending Section */}
              {trending.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      🔥 Trending Conversations
                    </h2>
                    <Link to="/explore?sort=popular" className={styles.viewAll}>
                      View all
                    </Link>
                  </div>
                  <div className={styles.horizontalScroll}>
                    {trending.map((conv) => (
                      <div key={conv.id} className={styles.scrollItem}>
                        <ConversationCard conversation={conv} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Uploads */}
              {recent.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>📤 Recent Uploads</h2>
                    <Link to="/explore?sort=recent" className={styles.viewAll}>
                      View all
                    </Link>
                  </div>
                  <div className={styles.grid}>
                    {recent.map((conv) => (
                      <ConversationCard key={conv.id} conversation={conv} />
                    ))}
                  </div>
                </section>
              )}

              {/* Popular Tags */}
              {tags.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>🏷️ Popular Tags</h2>
                  <div className={styles.tagCloud}>
                    {tags.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        className={styles.tagBadge}
                        onClick={() => handleTagClick(tag.name)}
                        style={{
                          backgroundColor: tag.color
                            ? `${tag.color}20`
                            : 'var(--bg-secondary)',
                          borderColor: tag.color
                            ? `${tag.color}50`
                            : 'var(--border-color)',
                          color: tag.color || 'var(--text-secondary)',
                        }}
                      >
                        #{tag.name}
                        <span className={styles.tagCount}>
                          ({tag.conversationCount})
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
