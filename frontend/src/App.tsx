import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { Layout } from './components/Layout/Layout'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './hooks/useAuth'
import {
  ConversationPage,
  ExplorePage,
  HomePage,
  LoginPage,
  ProfilePage,
  RegisterPage,
  SettingsPage,
  UploadPage,
} from './pages'
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
      </Route>
    </Routes>
  )
}

const App = () => {
  return (
    <ErrorBoundary fallbackMessage="A critical application error occurred.">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export { App }
