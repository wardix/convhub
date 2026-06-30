import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import { FormInput } from '../components/AuthForms/FormInput'
import { GoogleAuthButton } from '../components/AuthForms/GoogleAuthButton'
import { useAppConfig } from '../context/AppConfigContext'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { mapUser } from '../utils/mappers'
import styles from './Auth.module.css'

export const LoginPage = () => {
  const { isAuthenticated, login } = useAuth()
  const { config } = useAppConfig()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const validate = () => {
    const errors: { email?: string; password?: string } = {}
    let isValid = true

    if (!email) {
      errors.email = 'Email is required'
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email format'
      isValid = false
    }

    if (!password) {
      errors.password = 'Password is required'
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
      const data = await api.post<{ user: unknown }>('/auth/login', {
        email,
        password,
      })
      login(mapUser(data.user))
      showToast('Logged in successfully', 'success')
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

  return (
    <>
      <Helmet>
        <title>Login — ConvHub</title>
        <meta name="description" content="Log in to your ConvHub account." />
      </Helmet>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.header}>
            <h1 className={styles.logo}>ConvHub</h1>
            <p className={styles.tagline}>
              Welcome back! Please enter your details.
            </p>
          </div>

          {error && <div className={styles.mainError}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <FormInput
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />

            <div className={styles.forgotPassword}>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? <span className={styles.spinner} /> : 'Log in'}
            </button>
          </form>

          {config.googleAuthEnabled && (
            <>
              <div className={styles.divider}>
                <span>or continue with</span>
              </div>

              <GoogleAuthButton
                onClick={() => {
                  window.location.href = '/api/auth/google'
                }}
                isLoading={isLoading}
              />
            </>
          )}

          {config.signupEnabled && (
            <p className={styles.footerText}>
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
