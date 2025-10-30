import { useCreateContact } from '@/api/mutations/contacts/useCreateContact'
import { useDeleteContact } from '@/api/mutations/contacts/useDeleteContact'
import { useDeleteContactEmail } from '@/api/mutations/contacts/useDeleteContactEmail'
import { useDeleteContactPhone } from '@/api/mutations/contacts/useDeleteContactPhone'
import { usePostContactEmail } from '@/api/mutations/contacts/usePostContactEmail'
import { usePostContactPhone } from '@/api/mutations/contacts/usePostContactPhone'
import { useUpdateContact } from '@/api/mutations/contacts/useUpdateContact'
import { useUpdateContactEmail } from '@/api/mutations/contacts/useUpdateContactEmail'
import { useUpdateContactPhone } from '@/api/mutations/contacts/useUpdateContactPhone'
import type { ContactType, PhoneTypeEnum } from '@ritchy/types'
import { toast } from 'sonner'

export const useContactMutations = (placeId: string) => {
  const createContact = useCreateContact()
  const deleteContact = useDeleteContact()
  const postContactEmail = usePostContactEmail()
  const deleteContactEmail = useDeleteContactEmail()
  const updateContactEmail = useUpdateContactEmail()
  const postContactPhone = usePostContactPhone()
  const deleteContactPhone = useDeleteContactPhone()
  const updateContactPhone = useUpdateContactPhone()
  const updateContact = useUpdateContact()

  return {
    contact: {
      create: async (
        firstName: string,
        lastName: string | undefined,
        type: ContactType,
      ) => {
        try {
          const result = await createContact.mutateAsync({
            placeId,
            firstName,
            lastName,
            type,
          })
          toast.success('Contact created successfully', {
            description: `${firstName} ${lastName || ''}`.trim(),
          })
          return result
        } catch (error) {
          toast.error('Failed to create contact', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      setPrimary: async (contactId: string) => {
        try {
          await updateContact.mutateAsync({
            contactId,
            isPrimary: true,
            placeId,
          })
          toast.success('Primary contact updated')
        } catch (error) {
          toast.error('Failed to update primary contact', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      unsetPrimary: async (contactId: string) => {
        try {
          await updateContact.mutateAsync({
            contactId,
            isPrimary: false,
            placeId,
          })
          toast.success('Primary contact removed')
        } catch (error) {
          toast.error('Failed to remove primary contact', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      delete: async (contactId: string) => {
        try {
          await deleteContact.mutateAsync({
            contactId,
            placeId,
          })
          toast.success('Contact deleted successfully')
        } catch (error) {
          toast.error('Failed to delete contact', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
    },
    email: {
      add: async (contactId: string, email: string) => {
        try {
          await postContactEmail.mutateAsync({
            contactId,
            email,
            placeId,
          })
          toast.success('Email added successfully', {
            description: email,
          })
        } catch (error) {
          toast.error('Failed to add email', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      delete: async (contactId: string, emailId: string) => {
        try {
          await deleteContactEmail.mutateAsync({
            emailId,
            contactId,
            placeId,
          })
          toast.success('Email removed')
        } catch (error) {
          toast.error('Failed to remove email', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      setPrimary: async (
        contactId: string,
        emailId: string,
        isPrimary: boolean,
      ) => {
        try {
          await updateContactEmail.mutateAsync({
            emailId,
            contactId,
            isPrimary,
            placeId,
          })
          toast.success(
            isPrimary ? 'Primary email updated' : 'Primary email removed',
          )
        } catch (error) {
          toast.error('Failed to update primary email', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
    },
    phone: {
      add: async (
        contactId: string,
        phone: string,
        type: (typeof PhoneTypeEnum.options)[number],
      ) => {
        try {
          await postContactPhone.mutateAsync({
            contactId,
            phone,
            type,
            placeId,
          })
          toast.success('Phone number added successfully', {
            description: phone,
          })
        } catch (error) {
          toast.error('Failed to add phone number', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      delete: async (contactId: string, phoneId: string) => {
        try {
          await deleteContactPhone.mutateAsync({
            phoneId,
            contactId,
            placeId,
          })
          toast.success('Phone number removed')
        } catch (error) {
          toast.error('Failed to remove phone number', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
      setPrimary: async (
        contactId: string,
        phoneId: string,
        isPrimary: boolean,
      ) => {
        try {
          await updateContactPhone.mutateAsync({
            phoneId,
            contactId,
            isPrimary,
            placeId,
          })
          toast.success(
            isPrimary ? 'Primary phone updated' : 'Primary phone removed',
          )
        } catch (error) {
          toast.error('Failed to update primary phone', {
            description:
              error instanceof Error ? error.message : 'Please try again',
          })
          throw error
        }
      },
    },
  }
}
