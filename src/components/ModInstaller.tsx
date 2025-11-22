import { Button } from './ui/button'
import { FolderOpen } from 'lucide-react'

export function ModInstaller() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-2">Game Path</div>
      <div className="p-2 rounded-lg bg-muted/20 border border-border/40">
        <div className="text-xs text-muted-foreground truncate mb-2">
          C:\Program Files\Hollow Knight
        </div>
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <FolderOpen className="h-3 w-3 mr-1.5" />
          Browse
        </Button>
      </div>
    </div>
  )
}
