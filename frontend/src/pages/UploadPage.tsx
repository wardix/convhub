import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadForm } from '../components/UploadForm/UploadForm'
import { useAuth } from '../hooks/useAuth'
import styles from './UploadPage.module.css'

export const UploadPage = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading || !isAuthenticated) {
    return null // or a loading spinner
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Conversation</h1>
        <p className={styles.subtitle}>
          Share your interesting AI interactions with the community. We'll
          extract the transcript and stats automatically.
        </p>
      </div>

      <UploadForm />
    </div>
  )
}
