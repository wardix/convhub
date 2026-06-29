import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { User } from '../types'
import styles from './SettingsPage.module.css'

export const SettingsPage = () => {
  const { user, updateUser } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setBio(user.bio || '')
      setAvatarUrl(user.avatarUrl || '')
    }
  }, [user])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      await api.put<{ user: User }>('/users/me', {
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })

      // Update auth context with new user data
      updateUser({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      })

      showToast('Profile updated successfully', 'success')
    } catch (_err) {
      showToast('Failed to update profile', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? This cannot be undone.',
      )
    ) {
      alert(
        'Delete account functionality is not implemented in the MVP backend yet.',
      )
    }
  }

  if (!user) return null

  return (
    <>
      <Helmet>
        <title>Settings — ConvHub</title>
        <meta
          name="description"
          content="Manage your ConvHub account settings."
        />
      </Helmet>
      <div className={styles.container}>
        <h1 className={styles.title}>Settings</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile Information</h2>
          <form onSubmit={handleProfileSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="displayName">
                Display Name
              </label>
              <input
                id="displayName"
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jane Doe"
                maxLength={50}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="avatarUrl">
                Avatar URL
              </label>
              <input
                id="avatarUrl"
                className={styles.input}
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                className={styles.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little about yourself"
                rows={4}
                maxLength={250}
              />
              <div className={styles.helpText}>{bio.length} / 250</div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Settings</h2>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={`${styles.input} ${styles.inputDisabled}`}
              type="text"
              value={user.username}
              disabled
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`${styles.input} ${styles.inputDisabled}`}
              type="email"
              value={user.email}
              disabled
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Danger Zone</h2>
          <p className={styles.dangerText}>
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
          <button
            type="button"
            className={`${styles.submitBtn} ${styles.dangerBtn}`}
            onClick={handleDeleteAccount}
          >
            Delete Account
          </button>
        </section>

        {toast && (
          <div
            className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  )
}
