import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { api } from '../api/client'

interface AppConfig {
  signupEnabled: boolean
  googleAuthEnabled: boolean
}

interface AppConfigContextType {
  config: AppConfig
  isLoading: boolean
}

const defaultConfig: AppConfig = {
  signupEnabled: true,
  googleAuthEnabled: false,
}

const AppConfigContext = createContext<AppConfigContextType>({
  config: defaultConfig,
  isLoading: true,
})

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get<AppConfig>('/config')
        if (data) {
          setConfig({
            signupEnabled: data.signupEnabled ?? true,
            googleAuthEnabled: data.googleAuthEnabled ?? false,
          })
        }
      } catch {
        // Use defaults on error
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  return (
    <AppConfigContext.Provider value={{ config, isLoading }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfig = () => useContext(AppConfigContext)
