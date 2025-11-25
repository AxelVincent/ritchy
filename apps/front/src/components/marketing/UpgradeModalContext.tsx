import { useUserMe } from '@/api/queries/users/useUserMe'
import type { UpgradeTrigger } from '@/components/marketing/UpgradeModal'
import { UpgradeModal } from '@/components/marketing/UpgradeModal'
import { type ReactNode, createContext, useContext, useState } from 'react'

interface UpgradeModalState {
  isOpen: boolean
  trigger?: UpgradeTrigger
  creditsRemaining?: number
}

interface UpgradeModalContextType {
  showUpgradeModal: (trigger: UpgradeTrigger, creditsRemaining?: number) => void
  hideUpgradeModal: () => void
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(
  undefined,
)

export const useUpgradeModal = () => {
  const context = useContext(UpgradeModalContext)
  if (!context) {
    throw new Error('useUpgradeModal must be used within UpgradeModalProvider')
  }
  return context
}

interface UpgradeModalProviderProps {
  children: ReactNode
}

export const UpgradeModalProvider = ({
  children,
}: UpgradeModalProviderProps) => {
  const [modalState, setModalState] = useState<UpgradeModalState>({
    isOpen: false,
  })
  const { data: meData } = useUserMe()

  const showUpgradeModal = (
    trigger: UpgradeTrigger,
    creditsRemaining?: number,
  ) => {
    // Only show modal for FREE plan users
    if (meData?.plan === 'FREE') {
      setModalState({
        isOpen: true,
        trigger,
        creditsRemaining: creditsRemaining ?? meData?.credits?.credits,
      })
    }
  }

  const hideUpgradeModal = () => {
    setModalState({ isOpen: false })
  }

  return (
    <UpgradeModalContext.Provider
      value={{ showUpgradeModal, hideUpgradeModal }}
    >
      {children}
      {modalState.isOpen && modalState.trigger && (
        <UpgradeModal
          trigger={modalState.trigger}
          creditsRemaining={modalState.creditsRemaining}
          onClose={hideUpgradeModal}
        />
      )}
    </UpgradeModalContext.Provider>
  )
}
