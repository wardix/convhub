import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock react-helmet-async
vi.mock('react-helmet-async', () => ({
  HelmetProvider: ({ children }: { children: React.ReactNode }) => children,
  Helmet: ({ children }: { children: React.ReactNode }) => children,
}))
