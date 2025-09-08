import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrollArea } from './scroll-area'

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i.toString()} className="text-sm">
            v1.2.0-beta.{i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i.toString()} className="shrink-0">
            <div className="h-20 w-20 rounded-md bg-muted" />
            <p className="mt-2 text-sm">Item {i + 1}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const WithContent: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Artists</h4>
        <div className="space-y-2">
          {[
            'The Beatles',
            'Led Zeppelin',
            'Pink Floyd',
            'Queen',
            'The Rolling Stones',
            'Nirvana',
            'Radiohead',
            'Coldplay',
            'U2',
            'Red Hot Chili Peppers',
            'Foo Fighters',
            'Green Day',
            'Linkin Park',
            'Muse',
            'Arctic Monkeys',
            'The Killers',
            'Imagine Dragons',
            'Twenty One Pilots',
            'Panic! At The Disco',
            'Fall Out Boy',
          ].map((artist) => (
            <div key={artist} className="text-sm">
              {artist}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
}

export const LongText: Story = {
  render: () => (
    <ScrollArea className="h-72 w-96 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">
          Terms of Service
        </h4>
        <div className="space-y-2 text-sm">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
            cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
            quae ab illo inventore veritatis et quasi architecto beatae vitae
            dicta sunt explicabo.
          </p>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
            fugit, sed quia consequuntur magni dolores eos qui ratione
            voluptatem sequi nesciunt.
          </p>
          <p>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit, sed quia non numquam eius modi tempora
            incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
          </p>
        </div>
      </div>
    </ScrollArea>
  ),
}
