import { Button } from './ui/button'
import { Input } from './ui/input'
import { FolderOpen } from 'lucide-react'

export function Settings() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Game Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Game Directory
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="C:\Program Files\Hollow Knight"
                className="bg-background/50 border-border/40"
                disabled
              />
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
