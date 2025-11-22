import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Download, FolderOpen } from 'lucide-react'

export function ModInstaller() {
  const [modUrl, setModUrl] = useState('')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Install Mod</CardTitle>
          <CardDescription>Install a mod from URL or file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Mod URL or path..."
              value={modUrl}
              onChange={(e) => setModUrl(e.target.value)}
            />
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Install from URL
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            <FolderOpen className="h-4 w-4 mr-2" />
            Install from File
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Directory</CardTitle>
          <CardDescription>Configure Hollow Knight installation path</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="C:\Program Files\Hollow Knight" disabled />
          <Button variant="outline" className="w-full">
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
