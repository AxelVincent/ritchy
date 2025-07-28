import { useHubspotSyncPlace } from '@/api/mutations/integrations/hubspot/sync'
import { useHubspotStatus } from '@/api/queries/integrations/hubspot/oauth'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

interface HubspotSyncItemsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: {
    userPlaceId: string
  }[]
}

export function HubspotSyncItemsDialog({
  open,
  onOpenChange,
  selectedItems,
}: HubspotSyncItemsDialogProps) {
  const hubspotSyncPlaceMutation = useHubspotSyncPlace()
  const { data: hubspotStatus } = useHubspotStatus()
  const { toast } = useToast()
  const router = useRouter()

  if (hubspotStatus !== 'connected') return null

  const handleSyncToHubspot = () => {
    hubspotSyncPlaceMutation.mutate(
      { userPlaceIds: selectedItems.map((item) => item.userPlaceId) },
      {
        onSuccess: (response) => {
          if ('success' in response && response.success) {
            toast({
              title: 'HubSpot Sync Complete',
              description: `Successfully synced ${response.companyIds.length} place(s) to HubSpot.`,
            })
          } else {
            toast({
              title: 'HubSpot Sync Failed',
              description: response.error || 'Failed to sync places to HubSpot',
              variant: 'destructive',
            })
          }
          onOpenChange(false)
        },
        onError: (error) => {
          toast({
            title: 'HubSpot Sync Failed',
            description:
              error instanceof Error
                ? error.message
                : 'Failed to sync places to HubSpot',
            variant: 'destructive',
          })
          onOpenChange(false)
        },
      },
    )
  }

  const handleGoToMapping = () => {
    router.navigate({ to: '/integrations/hubspot' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md space-y-6">
        <DialogHeader>
          <DialogTitle>
            Sync {selectedItems.length} lead
            {selectedItems.length === 1 ? '' : 's'} to HubSpot
          </DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" className="mb-2">
          <AccordionItem value="field-mapping">
            <AccordionTrigger>Field mapping in use</AccordionTrigger>
            <AccordionContent>
              Companies and associated contacts will be created or updated in
              HubSpot based on your current field mapping.
              <br />
              <Button
                variant="link"
                className="p-0 h-auto text-blue-600 underline font-normal mt-2"
                onClick={handleGoToMapping}
                tabIndex={0}
              >
                Review field mapping
              </Button>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sync-details">
            <AccordionTrigger>What will happen during sync?</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>
                  Each place will be synced as a company record in HubSpot.
                </li>
                <li>
                  For each company, an associated contact will be created to
                  track the lead status and maintain the relationship between
                  the company and its primary contact.
                </li>
                <li>The sync will be processed as a single operation.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          className="w-full"
          onClick={handleSyncToHubspot}
          disabled={hubspotSyncPlaceMutation.isPending}
          size="lg"
        >
          {hubspotSyncPlaceMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            'Sync to HubSpot'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
