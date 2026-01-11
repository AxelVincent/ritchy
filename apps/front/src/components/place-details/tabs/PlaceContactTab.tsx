import { usePlaceContactsQuery } from '@/api/queries/places/contacts/usePlaceContacts'
import { ContactListSkeleton } from '@/components/contact/ContactListSkeleton'
import { CreateContactForm } from '@/components/contact/CreateContactForm'
import { UnifiedContactCard } from '@/components/contact/UnifiedContactCard'
import { EnrichmentAwareEmptyState } from '@/components/enrichment'
import { Button } from '@/components/ui/button'
import { useContactMutations } from '@/hooks/useContactMutations'
import type { Email, Phone, Place, SocialMedia } from '@api/shared'
import { UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const { data: contactsData, isLoading } = usePlaceContactsQuery(place.id)
  const mutations = useContactMutations(place.id)
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(
    new Set(),
  )
  const [showCreateForm, setShowCreateForm] = useState(false)

  const toggleContact = (contactId: string) => {
    setExpandedContacts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(contactId)) {
        newSet.delete(contactId)
      } else {
        newSet.add(contactId)
      }
      return newSet
    })
  }

  // Transform contacts data to match the Email type structure
  const transformedContacts = useMemo(() => {
    if (!contactsData || 'error' in contactsData) return []

    return contactsData.contacts.map((contact) => ({
      ...contact,
      emails: contact.emails.map((email) => ({
        ...email,
        createdAt: new Date(email.createdAt),
        updatedAt: new Date(email.updatedAt),
        quality: email.quality as Email['quality'],
        result: email.result as Email['result'],
      })) as Email[],
      phones: contact.phones.map((phone) => ({
        ...phone,
        type: phone.type as Phone['type'],
        createdAt: new Date(phone.createdAt),
        updatedAt: new Date(phone.updatedAt),
      })) as Phone[],
      socials: contact.socials.map((social) => ({
        ...social,
        socialMediaPlatform:
          social.platform as SocialMedia['socialMediaPlatform'],
        createdAt: new Date(social.createdAt),
        updatedAt: new Date(social.updatedAt),
      })) as SocialMedia[],
    }))
  }, [contactsData])

  // Find primary contact
  const primaryContact = useMemo(() => {
    return (
      transformedContacts.find((c) => c.isPrimary) || transformedContacts[0]
    )
  }, [transformedContacts])

  // Get secondary contacts (non-primary, excluding the one shown as primary)
  const secondaryContacts = useMemo(() => {
    if (!primaryContact) return []
    return transformedContacts.filter((c) => c.id !== primaryContact.id)
  }, [transformedContacts, primaryContact])

  // Loading state with skeleton
  if (isLoading) {
    return <ContactListSkeleton count={3} />
  }

  const hasContacts = transformedContacts.length > 0

  return (
    <>
      {/* Header with Add Contact Button - Always visible */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          size="sm"
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Create Contact Form Dialog - Always available */}
      <CreateContactForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onCreateContact={mutations.contact.create}
      />

      {/* Show empty state when no contacts */}
      {!hasContacts && (
        <EnrichmentAwareEmptyState placeId={place.id} hasData={false} />
      )}

      {/* Show contacts when they exist */}
      {hasContacts && (
        <div className="space-y-6 p-4">
          {/* Primary Contact Section */}
          {primaryContact && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Primary Contact</h3>
              </div>

              <UnifiedContactCard
                contact={primaryContact}
                companyEnriched={
                  place.enrichedStatus === 'ENRICHED' ||
                  place.enrichedStatus === 'RECENTLY_ENRICHED'
                }
                isPrimary
                isExpanded={expandedContacts.has(primaryContact.id)}
                onToggle={() => toggleContact(primaryContact.id)}
                onAddEmail={(email) =>
                  mutations.email.add(primaryContact.id, email)
                }
                onDeleteEmail={(emailId) =>
                  mutations.email.delete(primaryContact.id, emailId)
                }
                onSetPrimaryEmail={(emailId, isPrimary) =>
                  mutations.email.setPrimary(
                    primaryContact.id,
                    emailId,
                    isPrimary,
                  )
                }
                onAddPhone={(phone, type) =>
                  mutations.phone.add(primaryContact.id, phone, type)
                }
                onDeletePhone={(phoneId) =>
                  mutations.phone.delete(primaryContact.id, phoneId)
                }
                onSetPrimaryPhone={(phoneId, isPrimary) =>
                  mutations.phone.setPrimary(
                    primaryContact.id,
                    phoneId,
                    isPrimary,
                  )
                }
              />
            </section>
          )}

          {/* Other Contacts Section */}
          {secondaryContacts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  Other Contacts ({secondaryContacts.length})
                </h3>
              </div>

              <div className="space-y-3">
                {secondaryContacts.map((contact) => (
                  <UnifiedContactCard
                    key={contact.id}
                    contact={contact}
                    companyEnriched={
                      place.enrichedStatus === 'ENRICHED' ||
                      place.enrichedStatus === 'RECENTLY_ENRICHED'
                    }
                    isExpanded={expandedContacts.has(contact.id)}
                    onToggle={() => toggleContact(contact.id)}
                    onAddEmail={(email) =>
                      mutations.email.add(contact.id, email)
                    }
                    onDeleteEmail={(emailId) =>
                      mutations.email.delete(contact.id, emailId)
                    }
                    onSetPrimaryEmail={(emailId, isPrimary) =>
                      mutations.email.setPrimary(contact.id, emailId, isPrimary)
                    }
                    onAddPhone={(phone, type) =>
                      mutations.phone.add(contact.id, phone, type)
                    }
                    onDeletePhone={(phoneId) =>
                      mutations.phone.delete(contact.id, phoneId)
                    }
                    onSetPrimaryPhone={(phoneId, isPrimary) =>
                      mutations.phone.setPrimary(contact.id, phoneId, isPrimary)
                    }
                    onSetPrimaryContact={() =>
                      mutations.contact.setPrimary(contact.id)
                    }
                    onDeleteContact={() => mutations.contact.delete(contact.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
