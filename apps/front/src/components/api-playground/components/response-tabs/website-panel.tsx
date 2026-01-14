import { TechnologiesSection } from '@/components/company-display'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApiV1CompanyEnrichmentSuccessResponse } from '@api/routes_api/v1/enrich/contract'
import {
  faFacebook,
  faInstagram,
  faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Calendar, ExternalLink, Globe, Mail, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { CopyButton, InfoRow } from './shared'

interface WebsitePanelProps {
  response: ApiV1CompanyEnrichmentSuccessResponse
}

const emailTypeBadgeVariant = (type: 'generic' | 'role' | 'personal') => {
  switch (type) {
    case 'role':
      return 'default'
    case 'personal':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const WebsitePanel = ({ response }: WebsitePanelProps) => {
  const { website } = response.data

  if (!website) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <p>No website data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Domain & Description Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Website Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Short Description */}
          {website.shortDescription && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Short Description
              </p>
              <p className="text-sm">{website.shortDescription}</p>
            </div>
          )}

          {/* Full Description */}
          {website.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <ReactMarkdown>{website.description}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Domain Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {website.domain && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Domain</p>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {website.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {website.domainRegisteredAt && (
              <InfoRow
                label="Domain Registered"
                value={new Date(
                  website.domainRegisteredAt,
                ).toLocaleDateString()}
                icon={Calendar}
              />
            )}

            {website.title && (
              <InfoRow label="Page Title" value={website.title} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emails Card */}
      {website.emails && website.emails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails ({website.emails.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {website.emails.map((emailData) => (
                <div
                  key={emailData.email}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${emailData.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {emailData.email}
                    </a>
                    <CopyButton value={emailData.email} />
                  </div>
                  <Badge variant={emailTypeBadgeVariant(emailData.type)}>
                    {emailData.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Media Card */}
      {website.socials &&
        (website.socials.linkedin ||
          website.socials.facebook ||
          website.socials.instagram) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {website.socials.linkedin && (
                  <a
                    href={website.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                  >
                    <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4" />
                    <span className="text-sm font-medium">LinkedIn</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {website.socials.facebook && (
                  <a
                    href={website.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <FontAwesomeIcon icon={faFacebook} className="h-4 w-4" />
                    <span className="text-sm font-medium">Facebook</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {website.socials.instagram && (
                  <a
                    href={website.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors"
                  >
                    <FontAwesomeIcon icon={faInstagram} className="h-4 w-4" />
                    <span className="text-sm font-medium">Instagram</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Technologies Card */}
      {website.technologies && website.technologies.length > 0 && (
        <TechnologiesSection technologies={website.technologies} />
      )}
    </div>
  )
}
