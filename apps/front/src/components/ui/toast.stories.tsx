import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast'

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  parameters: {},
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Scheduled: Catch up</ToastTitle>
        <ToastDescription>
          Friday, February 10, 2023 at 5:57 PM
        </ToastDescription>
        <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const Destructive: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="destructive">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>
          Your session has expired. Please log in again.
        </ToastDescription>
        <ToastAction altText="Goto schedule to undo">Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const WithAction: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Success</ToastTitle>
        <ToastDescription>Your changes have been saved.</ToastDescription>
        <ToastAction altText="View details">View</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const Simple: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Notification</ToastTitle>
        <ToastDescription>You have a new message.</ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const LongText: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Important Update</ToastTitle>
        <ToastDescription>
          This is a longer toast message that contains more detailed information
          about what happened and what the user should do next.
        </ToastDescription>
        <ToastAction altText="Learn more">Learn More</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}

export const Multiple: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>First Toast</ToastTitle>
        <ToastDescription>This is the first toast message.</ToastDescription>
        <ToastClose />
      </Toast>
      <Toast>
        <ToastTitle>Second Toast</ToastTitle>
        <ToastDescription>This is the second toast message.</ToastDescription>
        <ToastClose />
      </Toast>
      <Toast variant="destructive">
        <ToastTitle>Error Toast</ToastTitle>
        <ToastDescription>This is an error toast message.</ToastDescription>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
}
