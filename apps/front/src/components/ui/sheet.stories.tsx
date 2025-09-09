import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { Button } from './button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

const meta: Meta<typeof Sheet> = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onOpenChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you're done.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right">
              Name
            </label>
            <input
              id="name"
              defaultValue="Pedro Duarte"
              className="col-span-3 px-3 py-2 border rounded-md"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-right">
              Username
            </label>
            <input
              id="username"
              defaultValue="@peduarte"
              className="col-span-3 px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        <SheetFooter>
          <Button type="submit">Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const LeftSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Left Sheet</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Navigate through the application.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <nav className="space-y-2">
            <a href="/ " className="block px-3 py-2 rounded-md hover:bg-accent">
              Dashboard
            </a>
            <a href="/ " className="block px-3 py-2 rounded-md hover:bg-accent">
              Projects
            </a>
            <a href="/ " className="block px-3 py-2 rounded-md hover:bg-accent">
              Settings
            </a>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  ),
}

export const TopSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Top Sheet</Button>
      </SheetTrigger>
      <SheetContent side="top">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>You have 3 new notifications.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="space-y-2">
            <div className="p-3 border rounded-md">
              <p className="font-medium">New message</p>
              <p className="text-sm text-muted-foreground">
                You have a new message from John.
              </p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Task completed</p>
              <p className="text-sm text-muted-foreground">
                Your task has been completed.
              </p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">System update</p>
              <p className="text-sm text-muted-foreground">
                System has been updated.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  ),
}

export const BottomSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Bottom Sheet</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Quick Actions</SheetTitle>
          <SheetDescription>Choose a quick action to perform.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline">Create Project</Button>
            <Button variant="outline">Add Task</Button>
            <Button variant="outline">Send Message</Button>
            <Button variant="outline">Schedule Meeting</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  ),
}

export const WithoutTrigger: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Welcome!</SheetTitle>
          <SheetDescription>
            This is a sheet without a trigger button, opened by default.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p>
            This sheet is opened by default and doesn't have a trigger button.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  ),
}
