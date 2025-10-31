import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export const FileUpload = ({ onFileSelect, isLoading }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((file) => file.type === 'text/csv')

    if (csvFile) {
      onFileSelect(csvFile)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <Card
        className={`w-full max-w-2xl border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-12">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Drop your CSV file here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse your files
            </p>
          </div>
          <Button onClick={handleBrowseClick} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Browse Files'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
            disabled={isLoading}
          />
        </div>
      </Card>

      <div className="text-sm text-muted-foreground space-y-1 text-center">
        <p>Maximum 1000 rows • 1 credit per place</p>
        <p>First row must be column headers (e.g., "Name" or "Place Id")</p>
      </div>
    </div>
  )
}
