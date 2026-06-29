import React, { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { Layout } from './components/Layout/Layout'
import { ToastContainer } from './components/ToastContainer/ToastContainer'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './hooks/useAuth'
import { HomePage, LoginPage, RegisterPage } from './pages'

const ExplorePage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.ExplorePage })),
)
const ConversationPage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.ConversationPage })),
)
const ProfilePage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.ProfilePage })),
)
const NotFoundPage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.NotFoundPage })),
)
const SettingsPage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.SettingsPage })),
)
const UploadPage = React.lazy(() =>
  import('./pages').then((module) => ({ default: module.UploadPage })),
)
import './index.css'

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Ensure AuthContext is loaded before routing decisions
const AppRoutes = () => {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <div>Initializing...</div>
  }

  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <ErrorBoundary>
                <HomePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="explore"
            element={
              <ErrorBoundary>
                <ExplorePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="conversations/:id"
            element={
              <ErrorBoundary>
                <ConversationPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="profile/:username"
            element={
              <ErrorBoundary>
                <ProfilePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="login"
            element={
              <ErrorBoundary>
                <LoginPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="register"
            element={
              <ErrorBoundary>
                <RegisterPage />
              </ErrorBoundary>
            }
          />

          {/* Protected Routes */}
          <Route
            path="upload"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <UploadPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Catch-all Not Found Route */}
          <Route
            path="*"
            element={
              <ErrorBoundary>
                <NotFoundPage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}

const App = () => {
  return (
    <ErrorBoundary fallbackMessage="A critical application error occurred.">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
              <ToastContainer />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export { App }
