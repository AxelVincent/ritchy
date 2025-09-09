import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from './emoji-picker'

const meta: Meta<typeof EmojiPicker> = {
  title: 'UI/EmojiPicker',
  component: EmojiPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <EmojiPicker>
      <EmojiPickerSearch placeholder="Search emojis..." />
      <EmojiPickerContent />
      <EmojiPickerFooter />
    </EmojiPicker>
  ),
}

export const WithCustomSize: Story = {
  render: () => (
    <EmojiPicker className="w-80">
      <EmojiPickerSearch placeholder="Search emojis..." />
      <EmojiPickerContent className="h-64 w-72" />
      <EmojiPickerFooter />
    </EmojiPicker>
  ),
}

export const InDialog: Story = {
  render: () => (
    <div className="p-4">
      <EmojiPicker>
        <EmojiPickerSearch placeholder="Search emojis..." />
        <EmojiPickerContent />
        <EmojiPickerFooter />
      </EmojiPicker>
    </div>
  ),
}

export const Compact: Story = {
  render: () => (
    <EmojiPicker className="w-64">
      <EmojiPickerSearch placeholder="Search..." />
      <EmojiPickerContent className="h-48 w-64" />
      <EmojiPickerFooter />
    </EmojiPicker>
  ),
}
