import type { Email } from '@ritchy/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { EmailDisplay } from './EmailDisplay'

const meta: Meta<typeof EmailDisplay> = {
  title: 'Components/Contact/EmailDisplay',
  component: EmailDisplay,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# EmailDisplay Component

A comprehensive email management component that allows users to view, add, delete, and manage email addresses with verification status and quality indicators.

## Features

- **Email Management**: Add, delete, and set primary emails
- **Real-time Validation**: Zod-based email validation with visual feedback
- **Verification Status**: Shows verified/unverified status with quality indicators
- **Email Analysis**: Displays role-based, free email, and source information
- **Interactive UI**: Dropdown menus for email actions
- **Accessibility**: Full keyboard navigation and screen reader support

## Email States

- **Verified**: Email has been verified and is deliverable
- **Unverified**: Email status is unknown or pending verification
- **Good Quality**: Email appears to be legitimate and well-maintained
- **Risky Quality**: Email may be temporary, disposable, or suspicious

## Usage

\`\`\`tsx
import { EmailDisplay } from '@/components/contact/EmailDisplay'

const emails = [
  {
    id: '1',
    email: 'user@example.com',
    isPrimary: true,
    isVerified: true,
    quality: 'good',
    // ... other properties
  }
]

<EmailDisplay
  emails={emails}
  onAddEmail={handleAddEmail}
  onDeleteEmail={handleDeleteEmail}
  onSetPrimary={handleSetPrimary}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    emails: {
      description:
        'Array of email data objects containing email information and verification status',
      control: 'object',
      table: {
        type: { summary: 'EmailData[]' },
        defaultValue: { summary: '[]' },
      },
    },
    onAddEmail: {
      description: 'Callback function called when adding a new email address',
      action: 'email added',
      table: {
        type: { summary: '(email: string) => Promise<void>' },
      },
    },
    onDeleteEmail: {
      description: 'Callback function called when deleting an email address',
      action: 'email deleted',
      table: {
        type: { summary: '(id: string) => Promise<void>' },
      },
    },
    onSetPrimary: {
      description: 'Callback function called when setting an email as primary',
      action: 'email set as primary',
      table: {
        type: { summary: '(id: string) => Promise<void>' },
      },
    },
    className: {
      description: 'Additional CSS classes to apply to the component',
      control: 'text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
      },
    },
  },
  args: {
    onAddEmail: fn(),
    onDeleteEmail: fn(),
    onSetPrimary: fn(),
  },
}

export default meta
type Story = StoryObj<typeof EmailDisplay>

// Mock email data
const mockEmails: Email[] = [
  {
    id: '1',
    contactId: '1',
    email: 'john.doe@example.com',
    isPrimary: true,
    source: 'https://example.com',
    isVerified: true,
    quality: 'good',
    result: 'ok',
    role: false,
    free: false,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: '2',
    contactId: '2',
    email: 'j.doe@company.com',
    isPrimary: false,
    source: 'https://company.com',
    isVerified: true,
    quality: 'risky',
    result: 'ok',
    role: true,
    free: false,
    createdAt: new Date('2024-01-16T14:20:00Z'),
    updatedAt: new Date('2024-01-16T14:20:00Z'),
  },
  {
    id: '3',
    contactId: '3',
    email: 'john@gmail.com',
    isPrimary: false,
    isVerified: false,
    quality: 'good',
    result: 'unknown',
    role: false,
    free: true,
    createdAt: new Date('2024-01-17T09:15:00Z'),
    updatedAt: new Date('2024-01-17T09:15:00Z'),
  },
]

const verifiedEmails: Email[] = [
  {
    id: '1',
    contactId: '1',
    email: 'primary@example.com',
    isPrimary: true,
    source: 'https://example.com',
    isVerified: true,
    quality: 'good',
    result: 'ok',
    role: false,
    free: false,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: '2',
    contactId: '2',
    email: 'secondary@company.com',
    isPrimary: false,
    source: 'https://company.com',
    isVerified: true,
    quality: 'good',
    result: 'ok',
    role: false,
    free: false,
    createdAt: new Date('2024-01-16T14:20:00Z'),
    updatedAt: new Date('2024-01-16T14:20:00Z'),
  },
]

const riskyEmails: Email[] = [
  {
    id: '1',
    contactId: '1',
    email: 'risky@example.com',
    isPrimary: true,
    isVerified: true,
    quality: 'risky',
    result: 'ok',
    role: true,
    free: true,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
]

const unverifiedEmails: Email[] = [
  {
    id: '1',
    contactId: '1',
    email: 'unverified@example.com',
    isPrimary: true,
    isVerified: false,
    quality: 'good',
    result: 'unknown',
    role: false,
    free: false,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  },
]

// Stories
export const Default: Story = {
  args: {
    emails: mockEmails,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The default EmailDisplay component showing a mix of verified, unverified, and risky emails with different quality indicators.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    emails: [],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty state when no emails are present. Shows a call-to-action card encouraging users to add their first email address.',
      },
    },
  },
}

export const SingleEmail: Story = {
  args: {
    emails: [mockEmails[0]],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Displays a single email with all verification details, quality indicators, and management options. Perfect for testing individual email states.',
      },
    },
  },
}

export const MultipleVerified: Story = {
  args: {
    emails: verifiedEmails,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows multiple verified emails with good quality ratings. Demonstrates how the component handles multiple items with consistent verification status.',
      },
    },
  },
}

export const WithRiskyEmails: Story = {
  args: {
    emails: riskyEmails,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Displays emails marked as risky quality with appropriate warning indicators. These emails may be temporary, disposable, or suspicious.',
      },
    },
  },
}

export const UnverifiedEmails: Story = {
  args: {
    emails: unverifiedEmails,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows unverified emails with appropriate status indicators. These emails have not yet been verified for deliverability.',
      },
    },
  },
}

export const MixedStatus: Story = {
  args: {
    emails: [...verifiedEmails, ...riskyEmails, ...unverifiedEmails],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Displays a comprehensive mix of verified, unverified, and risky emails to demonstrate all possible states and quality indicators in one view.',
      },
    },
  },
}

export const WithRoleEmails: Story = {
  args: {
    emails: [
      {
        id: '1',
        contactId: '1',
        email: 'admin@company.com',
        isPrimary: true,
        isVerified: true,
        quality: 'good',
        result: 'ok',
        role: true,
        free: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '2',
        contactId: '2',
        email: 'noreply@company.com',
        isPrimary: false,
        isVerified: true,
        quality: 'risky',
        result: 'ok',
        role: true,
        free: false,
        createdAt: new Date('2024-01-16T14:20:00Z'),
        updatedAt: new Date('2024-01-16T14:20:00Z'),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows emails identified as role-based addresses (like admin@, noreply@, support@, etc.). These are typically not personal email addresses.',
      },
    },
  },
}

export const WithFreeEmails: Story = {
  args: {
    emails: [
      {
        id: '1',
        contactId: '1',
        email: 'user@gmail.com',
        isPrimary: true,
        isVerified: true,
        quality: 'good',
        result: 'ok',
        role: false,
        free: true,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '2',
        contactId: '2',
        email: 'user@yahoo.com',
        isPrimary: false,
        isVerified: true,
        quality: 'good',
        result: 'ok',
        role: false,
        free: true,
        createdAt: new Date('2024-01-16T14:20:00Z'),
        updatedAt: new Date('2024-01-16T14:20:00Z'),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Displays free email providers (Gmail, Yahoo, Hotmail, etc.) with appropriate indicators. These are typically personal email addresses.',
      },
    },
  },
}

export const WithSources: Story = {
  args: {
    emails: [
      {
        id: '1',
        contactId: '1',
        email: 'found@example.com',
        isPrimary: true,
        source: 'https://example.com/contact',
        isVerified: true,
        quality: 'good',
        result: 'ok',
        role: false,
        free: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '2',
        contactId: '2',
        email: 'scraped@company.com',
        isPrimary: false,
        source: 'https://company.com/about',
        isVerified: true,
        quality: 'risky',
        result: 'ok',
        role: false,
        free: false,
        createdAt: new Date('2024-01-16T14:20:00Z'),
        updatedAt: new Date('2024-01-16T14:20:00Z'),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows emails with source URLs indicating where they were found or scraped from. Clicking the source link opens the original page in a new tab.',
      },
    },
  },
}

export const LongEmailList: Story = {
  args: {
    emails: Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      contactId: `${i + 1}`,
      email: `email${i + 1}@example${i + 1}.com`,
      isPrimary: i === 0,
      source: i % 2 === 0 ? `https://example${i + 1}.com` : undefined,
      isVerified: i % 3 !== 0,
      quality: i % 4 === 0 ? 'risky' : 'good',
      result: i % 3 === 0 ? 'unknown' : 'ok',
      role: i % 5 === 0,
      free: i % 6 === 0,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
    })),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Displays a long list of emails to test scrolling behavior and performance with many items. Useful for testing the component under load.',
      },
    },
  },
}

export const Interactive: Story = {
  args: {
    emails: mockEmails,
  },
  parameters: {
    docs: {
      description: {
        story: `
Interactive story for testing all component functionality:

**Add Email Form:**
- Click "Add Email" to open the form
- Test real-time validation with various email formats
- Try adding duplicate emails to see validation errors
- Use Enter to submit or Escape to cancel

**Email Management:**
- Use the dropdown menu (three dots) on each email
- Set non-primary emails as primary
- Delete emails (with confirmation)
- Test loading states during operations

**Validation States:**
- Valid emails show green checkmark
- Invalid emails show red error icon
- Duplicate emails show appropriate error message
- Empty input shows no validation state
        `,
      },
    },
  },
  play: async () => {
    // This story is designed for manual interaction testing
    // Users can test:
    // - Adding new emails with validation
    // - Setting primary emails
    // - Deleting emails
    // - Form validation states
  },
}
