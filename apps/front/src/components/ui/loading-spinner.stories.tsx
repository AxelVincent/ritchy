import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingSpinner } from './loading-spinner'

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <LoadingSpinner />,
}

export const InContainer: Story = {
  render: () => (
    <div className="w-64 h-32 border rounded-md">
      <LoadingSpinner />
    </div>
  ),
}

export const WithText: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center space-y-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  ),
}

export const FullScreen: Story = {
  render: () => (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
      <LoadingSpinner />
    </div>
  ),
}

export const Small: Story = {
  render: () => (
    <div className="flex items-center justify-center w-16 h-16">
      <div
        className="w-4 h-4 border-2 border-primary rounded-full border-t-transparent animate-spin"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  ),
}

export const Large: Story = {
  render: () => (
    <div className="flex items-center justify-center w-32 h-32">
      <div
        className="w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  ),
}
