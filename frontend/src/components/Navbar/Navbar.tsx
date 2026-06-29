import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './Navbar.module.css'

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
        return
      }

      if (e.key === 'Tab') {
        if (!menuRef.current) return

        // Find all focusable elements inside the menu container
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus the first element when opened
    if (menuRef.current) {
      const focusable = menuRef.current.querySelectorAll('input')
      if (focusable.length > 0) {
        // give it a tick
        setTimeout(() => (focusable[0] as HTMLElement).focus(), 10)
      }
    }

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.container} ref={menuRef}>
        <div className={styles.logoWrapper}>
          <div className={styles.logo}>
            <Link to="/">ConvHub</Link>
          </div>
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <div
              className={`${styles.hamburger} ${isMobileMenuOpen ? styles.open : ''}`}
            >
              <span />
              <span />
              <span />
            </div>
          </button>
        </div>

        <div
          className={`${styles.mobileMenuContent} ${isMobileMenuOpen ? styles.open : ''}`}
        >
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </form>

          <nav className={styles.nav}>
            <Link to="/explore" className={styles.navLink}>
              Explore
            </Link>
            {isAuthenticated && (
              <Link to="/upload" className={styles.navLink}>
                Upload
              </Link>
            )}

            <div className={styles.actions}>
              <ThemeToggle />

              {isAuthenticated ? (
                <div className={styles.userMenu}>
                  <Link
                    to={`/profile/${user?.username}`}
                    className={styles.avatar}
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className={styles.logoutBtn}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className={styles.authLinks}>
                  <Link to="/login" className={styles.loginBtn}>
                    Log in
                  </Link>
                  <Link to="/register" className={styles.registerBtn}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
