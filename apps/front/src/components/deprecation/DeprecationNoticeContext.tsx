import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import posthog from 'posthog-js'
import { STORAGE_KEY } from './constants'
import { DeprecationModal } from './DeprecationModal'

interface DeprecationNoticeContextType {
  dismissModal: () => void
}

const DeprecationNoticeContext = createContext<
  DeprecationNoticeContextType | undefined
>(undefined)

export const useDeprecationNotice = () => {
  const context = useContext(DeprecationNoticeContext)
  if (!context) {
    throw new Error(
      'useDeprecationNotice must be used within DeprecationNoticeProvider',
    )
  }
  return context
}

interface DeprecationNoticeProviderProps {
  children: ReactNode
}

export const DeprecationNoticeProvider = ({
  children,
}: DeprecationNoticeProviderProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const hasTrackedShown = useRef(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      setIsOpen(!dismissed)
    } catch (error) {
      console.error('Failed to read deprecation dismissal:', error)
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !hasTrackedShown.current) {
      posthog.capture('deprecation_notice_shown')
      hasTrackedShown.current = true
    }
  }, [isOpen])

  const dismissModal = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
      posthog.capture('deprecation_notice_dismissed')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to save deprecation dismissal:', error)
      setIsOpen(false)
    }
  }

  return (
    <DeprecationNoticeContext.Provider value={{ dismissModal }}>
      {children}
      {isOpen && <DeprecationModal onClose={dismissModal} />}
    </DeprecationNoticeContext.Provider>
  )
}
