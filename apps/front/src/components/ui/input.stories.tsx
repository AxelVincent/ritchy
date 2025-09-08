import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { Input } from './input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    readOnly: {
      control: { type: 'boolean' },
    },
  },
  args: {
    onChange: fn(),
    onClear: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Type something...',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Hello World',
    placeholder: 'Type something...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
}

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    value: 'Read only value',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter email',
  },
}

export const NumberInput: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter number',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <label htmlFor="email">Email</label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <label htmlFor="email">Email</label>
      <Input
        type="email"
        id="email"
        placeholder="Email"
        className="border-red-500"
      />
      <p className="text-sm text-red-500">
        Please enter a valid email address.
      </p>
    </div>
  ),
}
