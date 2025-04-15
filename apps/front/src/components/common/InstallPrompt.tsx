import { useState } from 'react'
import { useDevice } from '../../hooks/useDevice'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

interface SafariNavigator extends Navigator {
  standalone?: boolean
}

export const InstallPrompt = () => {
  const [showInstructions, setShowInstructions] = useState(false)
  const { deviceType, browserName } = useDevice()

  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as SafariNavigator).standalone)

  const isIOS = deviceType === 'ios'
  const isSafari = browserName === 'safari'
  const isChrome = browserName === 'chrome'
  const isMobile = deviceType === 'ios' || deviceType === 'android'

  // If already in PWA mode, don't show anything
  if (isPWA) return null

  const handleInstallClick = () => {
    setShowInstructions(true)
  }

  // Only show on mobile devices
  if (!isMobile) return null

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50">
        <Button onClick={handleInstallClick}>Install App</Button>
      </div>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isIOS ? 'Install on iPhone' : 'Install on Android'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isIOS ? (
              <>
                {!isSafari && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <p className="font-medium text-destructive">
                      Please open in Safari first
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" onClick={handleCopyLink}>
                        Copy Link
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Then paste in Safari
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    1
                  </div>
                  <p>Tap the Share button in Safari</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    2
                  </div>
                  <p>Tap "Add to Home Screen"</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    3
                  </div>
                  <p>Tap "Add"</p>
                </div>
              </>
            ) : (
              <>
                {!isChrome && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <p className="font-medium text-destructive">
                      Please open in Chrome first
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" onClick={handleCopyLink}>
                        Copy Link
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Then paste in Chrome
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    1
                  </div>
                  <p>Tap "Install App" when prompted</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    2
                  </div>
                  <p>Or tap the menu (⋮) at the top right</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    3
                  </div>
                  <p>Select "Install App"</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
