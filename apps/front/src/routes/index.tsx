import { AuroraBackground } from '@/components/ui/aurora-background'
import { useIsMobile } from '@/hooks/use-mobile'
import { SignIn } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const isMobile = useIsMobile()

  const Content = () => (
    <motion.div
      initial={{ opacity: 0.0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.3,
        duration: 0.8,
        ease: 'easeInOut',
      }}
      className="relative flex flex-col gap-4 items-center justify-center px-4"
    >
      <div className="text-3xl md:text-5xl">🐕</div>
      <div className="text-3xl md:text-6xl font-bold dark:text-white text-center">
        Meet Ritchy
      </div>
      <div className="font-extralight text-base md:text-4xl dark:text-neutral-200 py-4">
        Your loyal companion for sales success
      </div>
      <div className="text-sm md:text-lg text-muted-foreground text-center">
        Start your free trial today -{' '}
        <span className="font-bold">no credit card required</span>
      </div>
    </motion.div>
  )

  if (isMobile) {
    return (
      <div className="container relative min-h-screen">
        <AuroraBackground className="absolute inset-0 space-y-4">
          <Content />
          <SignIn
            appearance={{
              elements: {
                rootBox: 'border-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                logoBox: 'hidden',
              },
              layout: {
                socialButtonsPlacement: 'bottom',
                showOptionalFields: false,
              },
            }}
            fallbackRedirectUrl="/search"
          />
        </AuroraBackground>
      </div>
    )
  }

  return (
    <div className="container relative h-full flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AuroraBackground>
        <Content />
      </AuroraBackground>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <SignIn fallbackRedirectUrl="/search" />
        </div>
      </div>
    </div>
  )
}
