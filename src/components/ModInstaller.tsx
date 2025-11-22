import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Download, FolderOpen, Settings } from 'lucide-react'

export function ModInstaller() {
  const [modUrl, setModUrl] = useState('')

  return (
    <div className="space-y-6">
      <Card className="bg-card/40 backdrop-blur-sm border-border/40">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg">Install Mod</CardTitle>
          </div>
          <CardDescription>Add new mods from URL or file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="https://github.com/..."
              value={modUrl}
              onChange={(e) => setModUrl(e.target.value)}
              className="bg-background/50 border-border/40 focus-visible:border-purple-500/50"
            />
            <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white border-0">
              <Download className="h-4 w-4 mr-2" />
              Install from URL
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
            </div>
          </div>
          <Button variant="outline" className="w-full border-border/40 hover:bg-accent/50">
            <FolderOpen className="h-4 w-4 mr-2" />
            Browse for File
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-border/40">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Game Directory</CardTitle>
          </div>
          <CardDescription>Hollow Knight installation path</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="C:\Program Files\Hollow Knight"
            disabled
            className="bg-muted/30 border-border/40 text-muted-foreground"
          />
          <Button variant="outline" className="w-full border-border/40 hover:bg-accent/50">
            <FolderOpen className="h-4 w-4 mr-2" />
            Change Directory
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
