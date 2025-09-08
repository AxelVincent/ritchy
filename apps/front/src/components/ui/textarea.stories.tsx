import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { Textarea } from './textarea'

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    rows: {
      control: { type: 'number' },
    },
  },
  args: {
    onChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Type your message here.',
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: 'This is a textarea with some default text.',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
  },
}

export const WithRows: Story = {
  args: {
    rows: 6,
    placeholder: 'This textarea has 6 rows.',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message">Your message</label>
      <Textarea placeholder="Type your message here." id="message" />
    </div>
  ),
}

export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message-2">Your message</label>
      <Textarea placeholder="Type your message here." id="message-2" />
      <p className="text-sm text-muted-foreground">
        Your message will be copied to the support team.
      </p>
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="grid w-full gap-1.5">
      <label htmlFor="message-3">Your message</label>
      <Textarea
        placeholder="Type your message here."
        id="message-3"
        className="border-red-500"
      />
      <p className="text-sm text-red-500">Your message is required.</p>
    </div>
  ),
}
