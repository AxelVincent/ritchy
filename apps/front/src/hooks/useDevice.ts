import { useEffect, useState } from 'react'

export const useDevice = () => {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>(
    'desktop',
  )
  const [browserName, setBrowserName] = useState<string>('')

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent)

    setDeviceType(isIOS ? 'ios' : isAndroid ? 'android' : 'desktop')
    setBrowserName(isSafari ? 'safari' : 'other')
  }, [])

  return { deviceType, browserName }
}
