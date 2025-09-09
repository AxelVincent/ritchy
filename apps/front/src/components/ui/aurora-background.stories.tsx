import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuroraBackground } from './aurora-background'
import { Button } from './button'

const meta: Meta<typeof AuroraBackground> = {
  title: 'UI/AuroraBackground',
  component: AuroraBackground,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <AuroraBackground>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Aurora</h1>
        <p className="text-lg text-muted-foreground">
          Experience the beautiful aurora background effect.
        </p>
        <Button>Get Started</Button>
      </div>
    </AuroraBackground>
  ),
}

export const WithContent: Story = {
  render: () => (
    <AuroraBackground>
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold">Aurora Background</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          This is a beautiful aurora background component that creates an
          animated gradient effect.
        </p>
        <div className="flex gap-4 justify-center">
          <Button>Primary Action</Button>
          <Button variant="outline">Secondary Action</Button>
        </div>
      </div>
    </AuroraBackground>
  ),
}

export const WithoutRadialGradient: Story = {
  render: () => (
    <AuroraBackground showRadialGradient={false}>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Aurora Without Radial Gradient</h1>
        <p className="text-lg text-muted-foreground">
          This version doesn't use the radial gradient mask.
        </p>
        <Button>Learn More</Button>
      </div>
    </AuroraBackground>
  ),
}

export const CustomHeight: Story = {
  render: () => (
    <AuroraBackground className="h-96">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Custom Height</h1>
        <p className="text-muted-foreground">
          This aurora background has a custom height of 24rem.
        </p>
      </div>
    </AuroraBackground>
  ),
}

export const WithForm: Story = {
  render: () => (
    <AuroraBackground>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Sign Up</h1>
          <p className="text-muted-foreground">
            Create your account to get started.
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 border rounded-md bg-background/50 backdrop-blur-sm"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 border rounded-md bg-background/50 backdrop-blur-sm"
          />
          <Button className="w-full">Sign Up</Button>
        </div>
      </div>
    </AuroraBackground>
  ),
}
