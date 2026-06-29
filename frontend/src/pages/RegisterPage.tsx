import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import { FormInput } from '../components/AuthForms/FormInput'
import { GoogleAuthButton } from '../components/AuthForms/GoogleAuthButton'
import { PasswordStrength } from '../components/AuthForms/PasswordStrength'
import { useAuth } from '../hooks/useAuth'
import styles from './Auth.module.css'

export const RegisterPage = () => {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const validate = () => {
    const errors: Record<string, string> = {}
    let isValid = true

    if (!email) {
      errors.email = 'Email is required'
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email format'
      isValid = false
    }

    if (!username) {
      errors.username = 'Username is required'
      isValid = false
    } else if (username.length < 3 || username.length > 50) {
      errors.username = 'Username must be 3-50 characters'
      isValid = false
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username =
        'Username can only contain letters, numbers, and underscores'
      isValid = false
    }

    if (!password) {
      errors.password = 'Password is required'
      isValid = false
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
      isValid = false
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    setFieldErrors(errors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validate()) return

    setIsLoading(true)
    try {
      const data = await api.post('/auth/register', {
        email,
        username,
        display_name: displayName || null,
        password,
      })
      register(data.user)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    window.location.href = '/api/auth/google'
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <h1 className={styles.logo}>ConvHub</h1>
          <p className={styles.tagline}>
            Create an account to join the community.
          </p>
        </div>

        {error && <div className={styles.mainError}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={isLoading}
          />

          <FormInput
            label="Username"
            type="text"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
            disabled={isLoading}
          />

          <FormInput
            label="Display Name (Optional)"
            type="text"
            placeholder="John Doe"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.displayName}
            disabled={isLoading}
          />

          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={isLoading}
          />

          <PasswordStrength password={password} />

          <FormInput
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={isLoading}
          />

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? <span className={styles.spinner} /> : 'Create account'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or continue with</span>
        </div>

        <GoogleAuthButton onClick={handleGoogleLogin} isLoading={isLoading} />

        <p className={styles.footerText}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
