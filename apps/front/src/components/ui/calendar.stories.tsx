import type { Meta, StoryObj } from '@storybook/react-vite'
import { Calendar } from './calendar'

const meta: Meta<typeof Calendar> = {
  title: 'UI/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {} as never,
  render: () => <Calendar />,
}

export const WithSelectedDate: Story = {
  args: {} as never,
  render: () => <Calendar selected={new Date()} />,
}

export const WithDateRange: Story = {
  args: {} as never,
  render: () => (
    <Calendar
      mode="range"
      selected={{
        from: new Date(2024, 0, 1),
        to: new Date(2024, 0, 7),
      }}
    />
  ),
}

export const MultipleDates: Story = {
  args: {} as never,
  render: () => (
    <Calendar
      mode="multiple"
      selected={[
        new Date(2024, 0, 1),
        new Date(2024, 0, 3),
        new Date(2024, 0, 5),
      ]}
    />
  ),
}

export const DisabledDates: Story = {
  args: {} as never,
  render: () => (
    <Calendar
      disabled={(date) => {
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return date < tomorrow
      }}
    />
  ),
}

export const WithModifiers: Story = {
  args: {} as never,
  render: () => (
    <Calendar
      modifiers={{
        available: [
          new Date(2024, 0, 1),
          new Date(2024, 0, 2),
          new Date(2024, 0, 3),
        ],
        unavailable: [new Date(2024, 0, 4), new Date(2024, 0, 5)],
      }}
      modifiersStyles={{
        available: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
        },
        unavailable: {
          backgroundColor: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive-foreground))',
        },
      }}
    />
  ),
}
