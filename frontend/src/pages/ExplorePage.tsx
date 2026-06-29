import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { ConversationCard } from '../components/ConversationCard/ConversationCard'
import { SearchBar } from '../components/SearchBar/SearchBar'
import type { Conversation, PaginatedResponse, Tag } from '../types'
import styles from './ExplorePage.module.css'

type SortOption = 'recent' | 'popular' | 'discussed'

export const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialTag = searchParams.get('tag') || ''
  const initialSort = (searchParams.get('sort') as SortOption) || 'recent'

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [activeTag, setActiveTag] = useState(initialTag)
  const [activeSort, setActiveSort] = useState<SortOption>(initialSort)
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  // Fetch initial tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await api.get<Tag[]>('/tags')
        setTags(data)
      } catch (err) {
        console.error('Failed to load tags', err)
      }
    }
    fetchTags()
  }, [])

  // Fetch conversations based on filters
  const fetchConversations = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        if (reset) setIsLoading(true)
        else setIsLoadingMore(true)

        let url = `/conversations?page=${pageNum}&limit=12&sort=${activeSort}`
        if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`
        if (activeTag) url += `&tag=${encodeURIComponent(activeTag)}`

        const response = await api.get<PaginatedResponse<Conversation>>(url)

        setConversations((prev) =>
          reset ? response.data : [...prev, ...response.data],
        )
        setHasMore(pageNum < response.pagination.pages)
      } catch (err) {
        console.error('Failed to load conversations', err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [activeSort, searchQuery, activeTag],
  )

  // Trigger fetch when filters change
  useEffect(() => {
    setPage(1)
    fetchConversations(1, true)

    // Update URL params
    const newParams = new URLSearchParams()
    if (searchQuery) newParams.set('q', searchQuery)
    if (activeTag) newParams.set('tag', activeTag)
    if (activeSort !== 'recent') newParams.set('sort', activeSort)
    setSearchParams(newParams, { replace: true })
  }, [fetchConversations, searchQuery, activeTag, activeSort, setSearchParams])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchConversations(nextPage, false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <div className={styles.searchContainer}>
          <SearchBar
            onSearch={handleSearch}
            initialValue={searchQuery}
            placeholder="Search conversations by title, author, or content..."
          />
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Sort By</h3>
            <div className={styles.sortOptions}>
              <button
                type="button"
                className={`${styles.sortBtn} ${activeSort === 'recent' ? styles.active : ''}`}
                onClick={() => setActiveSort('recent')}
              >
                🕒 Recent
              </button>
              <button
                type="button"
                className={`${styles.sortBtn} ${activeSort === 'popular' ? styles.active : ''}`}
                onClick={() => setActiveSort('popular')}
              >
                🔥 Most Popular
              </button>
              <button
                type="button"
                className={`${styles.sortBtn} ${activeSort === 'discussed' ? styles.active : ''}`}
                onClick={() => setActiveSort('discussed')}
              >
                💬 Most Commented
              </button>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Popular Tags</h3>
              {activeTag && (
                <button
                  type="button"
                  className={styles.clearTagBtn}
                  onClick={() => setActiveTag('')}
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className={styles.tagList}>
              {tags.slice(0, 20).map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  className={`${styles.tagItem} ${activeTag === tag.name ? styles.activeTag : ''}`}
                  onClick={() =>
                    setActiveTag(activeTag === tag.name ? '' : tag.name)
                  }
                >
                  <span className={styles.tagName}>#{tag.name}</span>
                  <span className={styles.tagCount}>
                    {tag.conversationCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Searching...</p>
            </div>
          ) : conversations.length > 0 ? (
            <>
              <div className={styles.grid}>
                {conversations.map((conv) => (
                  <ConversationCard key={conv.id} conversation={conv} />
                ))}
              </div>

              {hasMore && (
                <div className={styles.loadMoreContainer}>
                  <button
                    type="button"
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3 className={styles.emptyTitle}>No conversations found</h3>
              <p className={styles.emptyDesc}>
                Try adjusting your search query or filters to find what you're
                looking for.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
