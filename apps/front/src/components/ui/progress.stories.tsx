import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress } from './progress'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 33,
  },
}

export const Half: Story = {
  args: {
    value: 50,
  },
}

export const AlmostComplete: Story = {
  args: {
    value: 90,
  },
}

export const Complete: Story = {
  args: {
    value: 100,
  },
}

export const Zero: Story = {
  args: {
    value: 0,
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>33%</span>
      </div>
      <Progress value={33} />
    </div>
  ),
}

export const DifferentSizes: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="text-sm">Small</div>
        <Progress value={33} className="h-1" />
      </div>
      <div className="space-y-2">
        <div className="text-sm">Default</div>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <div className="text-sm">Large</div>
        <Progress value={75} className="h-4" />
      </div>
    </div>
  ),
}

export const LoadingStates: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="text-sm">Starting...</div>
        <Progress value={10} />
      </div>
      <div className="space-y-2">
        <div className="text-sm">In Progress</div>
        <Progress value={45} />
      </div>
      <div className="space-y-2">
        <div className="text-sm">Almost Done</div>
        <Progress value={85} />
      </div>
      <div className="space-y-2">
        <div className="text-sm">Complete</div>
        <Progress value={100} />
      </div>
    </div>
  ),
}
