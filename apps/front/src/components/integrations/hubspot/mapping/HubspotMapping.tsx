import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanyMapping } from './CompanyMapping'
import { ContactMapping } from './ContactMapping'

export const HubspotMapping = () => {
  return (
    <Tabs defaultValue="company" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="company">Company Properties</TabsTrigger>
        <TabsTrigger value="contact">Contact Properties</TabsTrigger>
      </TabsList>
      <TabsContent value="company">
        <CompanyMapping />
      </TabsContent>
      <TabsContent value="contact">
        <ContactMapping />
      </TabsContent>
    </Tabs>
  )
}
