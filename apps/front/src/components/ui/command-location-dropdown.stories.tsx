import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command-location-dropdown'

const meta: Meta<typeof Command> = {
  title: 'UI/CommandLocationDropdown',
  component: Command,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Search locations..." />
      <CommandList>
        <CommandEmpty>No locations found.</CommandEmpty>
        <CommandGroup heading="Recent Locations">
          <CommandItem>
            <span>San Francisco, CA</span>
          </CommandItem>
          <CommandItem>
            <span>New York, NY</span>
          </CommandItem>
          <CommandItem>
            <span>Los Angeles, CA</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Popular Cities">
          <CommandItem>
            <span>Chicago, IL</span>
          </CommandItem>
          <CommandItem>
            <span>Houston, TX</span>
          </CommandItem>
          <CommandItem>
            <span>Phoenix, AZ</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Search locations..." />
      <CommandList>
        <CommandEmpty>No locations found.</CommandEmpty>
        <CommandGroup heading="Recent Locations">
          <CommandItem>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>San Francisco, CA</span>
          </CommandItem>
          <CommandItem>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>New York, NY</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Popular Cities">
          <CommandItem>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Chicago, IL</span>
          </CommandItem>
          <CommandItem>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Houston, TX</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const Simple: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          <CommandItem>San Francisco</CommandItem>
          <CommandItem>New York</CommandItem>
          <CommandItem>Los Angeles</CommandItem>
          <CommandItem>Chicago</CommandItem>
          <CommandItem>Houston</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const WithDialog: Story = {
  render: () => (
    <div className="space-y-2">
      <Button variant="outline">Open Location Search</Button>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Search locations..." />
        <CommandList>
          <CommandEmpty>No locations found.</CommandEmpty>
          <CommandGroup heading="Recent Locations">
            <CommandItem>San Francisco, CA</CommandItem>
            <CommandItem>New York, NY</CommandItem>
            <CommandItem>Los Angeles, CA</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
}
