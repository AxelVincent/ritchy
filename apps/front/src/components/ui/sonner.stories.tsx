import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'
import { ThemeProvider } from '../../providers/theme-provider'
import { Button } from './button'
import { Toaster } from './sonner'

const meta: Meta<typeof Toaster> = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="system">
        <div className="min-h-screen bg-background p-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Sonner Toast Examples</h1>
            <p className="text-muted-foreground">
              Click the buttons below to see different toast notifications.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => toast('Hello World!')}>
                Default Toast
              </Button>
              <Button onClick={() => toast.success('Success!')}>
                Success Toast
              </Button>
              <Button onClick={() => toast.error('Error occurred!')}>
                Error Toast
              </Button>
              <Button onClick={() => toast.warning('Warning message!')}>
                Warning Toast
              </Button>
              <Button onClick={() => toast.info('Information message!')}>
                Info Toast
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() =>
                  toast('Custom Toast', {
                    description: 'This is a custom toast with description',
                    action: {
                      label: 'Undo',
                      onClick: () => toast('Undo clicked!'),
                    },
                  })
                }
              >
                Toast with Action
              </Button>
              <Button
                onClick={() =>
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 2000)),
                    {
                      loading: 'Loading...',
                      success: 'Promise resolved!',
                      error: 'Promise rejected!',
                    },
                  )
                }
              >
                Promise Toast
              </Button>
              <Button
                onClick={() =>
                  toast('Rich Toast', {
                    description: 'This toast has rich content',
                    action: {
                      label: 'View',
                      onClick: () => toast('View clicked!'),
                    },
                    cancel: {
                      label: 'Cancel',
                      onClick: () => toast('Cancel clicked!'),
                    },
                  })
                }
              >
                Rich Toast
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => {
                  toast('First toast')
                  setTimeout(() => toast('Second toast'), 100)
                  setTimeout(() => toast('Third toast'), 200)
                }}
              >
                Multiple Toasts
              </Button>
              <Button
                onClick={() =>
                  toast('Long Toast Message', {
                    description:
                      'This is a much longer toast message that contains more detailed information about what happened and what the user should do next. It demonstrates how the toast handles longer content.',
                  })
                }
              >
                Long Toast
              </Button>
            </div>
          </div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithCustomPosition: Story = {
  args: {
    position: 'top-right',
  },
}

export const WithCustomDuration: Story = {
  args: {
    duration: 5000,
  },
}

export const WithRichColors: Story = {
  args: {
    richColors: true,
  },
}

export const WithCloseButton: Story = {
  args: {
    closeButton: true,
  },
}

export const WithCustomClassNames: Story = {
  args: {
    toastOptions: {
      classNames: {
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:border-2',
        description:
          'group-[.toast]:text-muted-foreground group-[.toast]:font-medium',
        actionButton:
          'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold',
        cancelButton:
          'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-bold',
      },
    },
  },
}

export const WithCustomTheme: Story = {
  args: {
    theme: 'dark',
  },
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-background p-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Dark Theme Sonner</h1>
            <p className="text-muted-foreground">
              Click the buttons below to see different toast notifications in
              dark theme.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => toast('Dark Theme Toast!')}>
                Default Toast
              </Button>
              <Button onClick={() => toast.success('Dark Success!')}>
                Success Toast
              </Button>
              <Button onClick={() => toast.error('Dark Error!')}>
                Error Toast
              </Button>
            </div>
          </div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export const InteractiveDemo: Story = {
  args: {},
  decorators: [
    (Story) => (
      <ThemeProvider defaultTheme="system">
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Sonner Toast System</h1>
              <p className="text-muted-foreground">
                A beautiful and customizable toast notification system built
                with Sonner.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Basic Toasts</h3>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => toast('Hello World!')}
                  >
                    Default
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      toast.success('Operation completed successfully!')
                    }
                  >
                    Success
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => toast.error('Something went wrong!')}
                  >
                    Error
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Advanced Toasts</h3>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() =>
                      toast('Action Required', {
                        description: 'Please review and confirm your changes',
                        action: {
                          label: 'Review',
                          onClick: () => toast('Reviewing...'),
                        },
                      })
                    }
                  >
                    With Action
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      toast.promise(
                        new Promise((resolve) => setTimeout(resolve, 3000)),
                        {
                          loading: 'Processing your request...',
                          success: 'Request completed successfully!',
                          error: 'Request failed. Please try again.',
                        },
                      )
                    }
                  >
                    Promise Toast
                  </Button>
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => {
                      toast('First notification')
                      setTimeout(() => toast('Second notification'), 500)
                      setTimeout(() => toast('Third notification'), 1000)
                    }}
                  >
                    Multiple Toasts
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Toasts will appear in the top-right corner by default.</p>
              <p>
                They automatically dismiss after 4 seconds or can be dismissed
                manually.
              </p>
            </div>
          </div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}
