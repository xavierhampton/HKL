import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FolderOpen } from 'lucide-react'

export function ModInstaller() {
  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Game Path</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          placeholder="C:\Program Files\Hollow Knight"
          disabled
          className="bg-muted/30 border-border/40 text-muted-foreground text-sm"
        />
        <Button variant="outline" size="sm" className="w-full border-border/40">
          <FolderOpen className="h-3.5 w-3.5 mr-2" />
          Browse
        </Button>
      </CardContent>
    </Card>
  )
}
