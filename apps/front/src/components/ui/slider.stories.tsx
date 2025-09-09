import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { Slider } from './slider'

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  parameters: {},
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: { type: 'number' },
    },
    max: {
      control: { type: 'number' },
    },
    step: {
      control: { type: 'number' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
  args: {
    onValueChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
  },
}

export const Range: Story = {
  args: {
    defaultValue: [20, 80],
    max: 100,
    step: 1,
  },
}

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    disabled: true,
  },
}

export const WithSteps: Story = {
  args: {
    defaultValue: [2],
    max: 10,
    step: 1,
  },
}

export const WithLabels: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Volume</span>
          <span>50%</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>
    </div>
  ),
}

export const RangeWithLabels: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Price Range</span>
          <span>$20 - $80</span>
        </div>
        <Slider defaultValue={[20, 80]} max={100} step={1} />
      </div>
    </div>
  ),
}

export const Temperature: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Temperature</span>
          <span>22°C</span>
        </div>
        <Slider defaultValue={[22]} min={0} max={50} step={1} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0°C</span>
          <span>50°C</span>
        </div>
      </div>
    </div>
  ),
}
